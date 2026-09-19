import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { registrationMachine, type CreateRegistration, type InviteMember, type RegistrationStatus } from '@sindikat/domain';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Создание заявки. Идемпотентно по ключу; при переполнении — лист ожидания.
   * SOLO → сразу WAITING_PAYMENT (или CONFIRMED без взноса), PAIR/TEAM/CREW → WAITING_MEMBERS.
   */
  async create(ownerId: string, tournamentId: string, dto: CreateRegistration, idempotencyKey: string) {
    const existingByKey = await this.prisma.registration.findUnique({ where: { idempotencyKey } });
    if (existingByKey) return this.withRelations(existingByKey.id);

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { registrations: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'WAITING_PAYMENT', 'WAITING_MEMBERS'] } } } } } },
    });
    if (!tournament) throw new NotFoundException();
    if (tournament.status !== 'REGISTRATION_OPEN') throw new BadRequestException('Регистрация закрыта');
    if (!tournament.formats.includes(dto.format)) throw new BadRequestException(`Формат ${dto.format} недоступен на этом турнире`);

    const duplicate = await this.prisma.registration.findUnique({ where: { tournamentId_ownerId: { tournamentId, ownerId } } });
    if (duplicate) throw new ConflictException('Заявка уже существует');

    const isFull = tournament._count.registrations >= tournament.capacity;
    const initial: RegistrationStatus = isFull
      ? 'WAITLISTED'
      : dto.format === 'SOLO'
        ? tournament.entryFeeMinor
          ? 'WAITING_PAYMENT'
          : 'CONFIRMED'
        : 'WAITING_MEMBERS';

    // взнос — за каждого участника заявки: пара ×2, экипаж ×2, команда ×4
    const seats = { SOLO: 1, PAIR: 2, CREW: 2, TEAM: 4 }[dto.format];
    const created = await this.prisma.registration.create({
      data: {
        tournamentId,
        ownerId,
        format: dto.format,
        status: initial,
        amountMinor: tournament.entryFeeMinor === null ? null : tournament.entryFeeMinor * seats,
        currency: tournament.currency,
        gearKitId: dto.gearKitId,
        boatId: dto.boatId,
        idempotencyKey,
        members: { create: { userId: ownerId, role: 'OWNER', invitationStatus: 'ACCEPTED', respondedAt: new Date() } },
      },
    });
    if (isFull) {
      const position = (await this.prisma.waitlistEntry.count({ where: { tournamentId } })) + 1;
      await this.prisma.waitlistEntry.create({ data: { tournamentId, userId: ownerId, position } });
    }
    return this.withRelations(created.id);
  }

  async getForUser(userId: string, id: string) {
    const reg = await this.withRelations(id);
    const isMember = reg.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException();
    return reg;
  }

  async invite(ownerId: string, id: string, dto: InviteMember) {
    const reg = await this.assertOwner(ownerId, id);
    if (reg.format === 'SOLO') throw new BadRequestException('В личной заявке нет напарника');
    const limit = { PAIR: 2, CREW: 2, TEAM: 4, SOLO: 1 }[reg.format];
    const members = await this.prisma.registrationMember.count({ where: { registrationId: id, invitationStatus: { in: ['PENDING', 'ACCEPTED'] } } });
    if (members >= limit) throw new BadRequestException(`В формате ${reg.format} не больше ${limit} участников`);
    if (dto.userId === ownerId) throw new BadRequestException('Нельзя пригласить самого себя');
    let userId = dto.userId;
    if (!userId && dto.phone) userId = (await this.prisma.user.findUnique({ where: { phone: dto.phone } }))?.id;
    const dup = await this.prisma.registrationMember.findFirst({ where: { registrationId: id, OR: [{ userId: userId ?? undefined }, { invitedPhone: dto.phone ?? undefined }], invitationStatus: { in: ['PENDING', 'ACCEPTED'] } } });
    if (dup) throw new ConflictException('Этот участник уже приглашён');

    const member = await this.prisma.registrationMember.create({
      data: { registrationId: id, userId, invitedPhone: dto.phone, role: reg.format === 'TEAM' ? 'TEAM_MEMBER' : 'PARTNER' },
    });
    if (userId) {
      const [t, owner] = await Promise.all([this.prisma.tournament.findUnique({ where: { id: reg.tournamentId }, select: { title: true } }), this.prisma.userProfile.findUnique({ where: { userId: ownerId } })]);
      await this.notifications.send(userId, 'registration.invited', `${owner?.displayName ?? 'Участник'} зовёт в пару`, `${t?.title ?? 'Турнир'}: подтвердите участие в заявке.`, { registrationId: id, tournamentId: reg.tournamentId });
    }
    // TODO(этап 2): SMS незарегистрированному напарнику по invitedPhone.
    return member;
  }

  async acceptInvitation(userId: string, id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true } });
    const member = await this.prisma.registrationMember.findFirst({
      where: { registrationId: id, invitationStatus: 'PENDING', OR: [{ userId }, { invitedPhone: user.phone }] },
    });
    if (!member) throw new NotFoundException('Приглашение не найдено');
    await this.prisma.registrationMember.update({
      where: { id: member.id },
      data: { userId, invitationStatus: 'ACCEPTED', respondedAt: new Date() },
    });
    // все приняли → ждём оплату
    const pending = await this.prisma.registrationMember.count({ where: { registrationId: id, invitationStatus: 'PENDING' } });
    if (pending === 0) {
      const reg = await this.prisma.registration.findUniqueOrThrow({ where: { id } });
      const next: RegistrationStatus = reg.amountMinor ? 'WAITING_PAYMENT' : 'CONFIRMED';
      await this.transition(id, next);
    }
    return this.withRelations(id);
  }

  listMine(userId: string) {
    return this.prisma.registration.findMany({
      where: { members: { some: { userId, invitationStatus: 'ACCEPTED' } } },
      include: { tournament: { select: { id: true, title: true, startsAt: true, status: true, discipline: true, level: true } }, members: { include: { user: { include: { profile: { select: { displayName: true } } } } } }, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { tournament: { startsAt: 'asc' } },
    });
  }

  async listInvitations(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true } });
    return this.prisma.registrationMember.findMany({
      where: { invitationStatus: 'PENDING', OR: [{ userId }, { invitedPhone: user.phone }], registration: { status: { in: ['WAITING_MEMBERS', 'WAITLISTED', 'DRAFT'] } } },
      include: { registration: { include: { tournament: { select: { id: true, title: true, startsAt: true } }, owner: { include: { profile: { select: { displayName: true } } } } } } },
    });
  }

  async declineInvitation(userId: string, registrationId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true } });
    const member = await this.prisma.registrationMember.findFirst({ where: { registrationId, invitationStatus: 'PENDING', OR: [{ userId }, { invitedPhone: user.phone }] } });
    if (!member) throw new NotFoundException('Приглашение не найдено');
    await this.prisma.registrationMember.update({ where: { id: member.id }, data: { invitationStatus: 'DECLINED', respondedAt: new Date() } });
    const reg = await this.prisma.registration.findUniqueOrThrow({ where: { id: registrationId }, include: { tournament: { select: { title: true } } } });
    await this.notifications.send(reg.ownerId, 'registration.invited', 'Напарник отказался', `${reg.tournament.title}: пригласите другого участника.`, { registrationId });
    return { status: 'declined' };
  }

  /** Стартовые номера по порядку подтверждения: только CONFIRMED-заявки без номера. */
  async assignStartNumbers(tournamentId: string, actorId: string) {
    const regs = await this.prisma.registration.findMany({ where: { tournamentId, status: { in: ['CONFIRMED', 'CHECKED_IN'] } }, orderBy: { createdAt: 'asc' } });
    const used = new Set(regs.map((r) => r.startNumber).filter(Boolean));
    let next = 1;
    let assigned = 0;
    for (const r of regs) {
      if (r.startNumber) continue;
      while (used.has(String(next).padStart(2, '0'))) next += 1;
      const startNumber = String(next).padStart(2, '0');
      used.add(startNumber);
      await this.prisma.registration.update({ where: { id: r.id }, data: { startNumber } });
      await this.notifications.send(r.ownerId, 'registration.confirmed', `Ваш стартовый номер — ${startNumber}`, 'Назовите его на регистрации и укажите на фото результата.', { registrationId: r.id, tournamentId });
      assigned += 1;
    }
    await this.prisma.auditLog.create({ data: { actorId, action: 'registrations.start_numbers', entityType: 'tournament', entityId: tournamentId, after: { assigned } } });
    return { assigned, total: regs.length };
  }

  async checkIn(tournamentId: string, id: string, actorId: string) {
    const reg = await this.prisma.registration.findUnique({ where: { id } });
    if (!reg || reg.tournamentId !== tournamentId) throw new NotFoundException();
    registrationMachine.assertTransition(reg.status, 'CHECKED_IN');
    const updated = await this.prisma.registration.update({ where: { id }, data: { status: 'CHECKED_IN' } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'registration.check_in', entityType: 'registration', entityId: id } });
    return updated;
  }

  async rejectByOrganizer(tournamentId: string, id: string, actorId: string, reason?: string) {
    const reg = await this.prisma.registration.findUnique({ where: { id }, include: { tournament: { select: { title: true } } } });
    if (!reg || reg.tournamentId !== tournamentId) throw new NotFoundException();
    const next: RegistrationStatus = reg.status === 'CONFIRMED' && reg.amountMinor ? 'REFUND_PENDING' : 'REJECTED';
    registrationMachine.assertTransition(reg.status, next === 'REFUND_PENDING' ? 'REJECTED' : next);
    await this.prisma.registration.update({ where: { id }, data: { status: next === 'REFUND_PENDING' ? 'REJECTED' : next } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'registration.reject', entityType: 'registration', entityId: id, after: { reason } } });
    await this.notifications.send(reg.ownerId, 'registration.confirmed', `${reg.tournament.title}: заявка отклонена`, reason ?? 'Организатор отклонил заявку. Взнос будет возвращён.', { registrationId: id });
    return { status: 'rejected' };
  }

  async startPayment(ownerId: string, id: string, idempotencyKey: string) {
    const reg = await this.assertOwner(ownerId, id);
    if (reg.status !== 'WAITING_PAYMENT' && reg.status !== 'PAYMENT_FAILED') throw new BadRequestException('Заявка не ожидает оплаты');
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
    // TODO(этап 2): реальный провайдер — создать платёж, вернуть confirmation URL; статус меняет webhook.
    // Dev-заглушка: платёж считается успешным сразу, заявка подтверждается.
    const payment = await this.prisma.payment.create({
      data: { registrationId: id, provider: 'stub', status: 'SUCCEEDED', paidAt: new Date(), amountMinor: reg.amountMinor ?? 0, currency: reg.currency, idempotencyKey },
    });
    await this.transition(id, 'CONFIRMED');
    return payment;
  }

  async cancel(ownerId: string, id: string) {
    const reg = await this.assertOwner(ownerId, id);
    const next: RegistrationStatus = reg.status === 'CONFIRMED' && reg.amountMinor ? 'REFUND_PENDING' : 'CANCELLED';
    await this.transition(id, next);
    // TODO(этап 2): освободить место и продвинуть лист ожидания.
    return this.withRelations(id);
  }

  private async transition(id: string, to: RegistrationStatus) {
    const reg = await this.prisma.registration.findUniqueOrThrow({ where: { id }, select: { status: true } });
    registrationMachine.assertTransition(reg.status, to);
    return this.prisma.registration.update({ where: { id }, data: { status: to } });
  }

  private async assertOwner(ownerId: string, id: string) {
    const reg = await this.prisma.registration.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException();
    if (reg.ownerId !== ownerId) throw new ForbiddenException();
    return reg;
  }

  private withRelations(id: string) {
    return this.prisma.registration.findUniqueOrThrow({
      where: { id },
      include: { tournament: { select: { id: true, title: true, startsAt: true, status: true, discipline: true, level: true } }, members: { include: { user: { include: { profile: { select: { displayName: true } } } } } }, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }
}
