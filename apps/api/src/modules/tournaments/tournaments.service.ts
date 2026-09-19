import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { tournamentMachine, type TournamentListQuery, type TournamentStatus, type TournamentSummary, type UpsertRules, type UpsertTournament } from '@sindikat/domain';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { FinalizationService } from '../competition/finalization.service.js';

const PUBLIC_STATUSES: TournamentStatus[] = ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'LIVE', 'JUDGING', 'FINALIZED', 'POSTPONED'];

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finalization: FinalizationService,
  ) {}

  async list(q: TournamentListQuery, opts: { includeDrafts?: boolean } = {}): Promise<TournamentSummary[]> {
    const rows = await this.prisma.tournament.findMany({
      where: {
        seasonId: q.seasonId,
        discipline: q.discipline,
        level: q.level,
        status: q.status ?? (opts.includeDrafts ? undefined : { in: PUBLIC_STATUSES }),
        startsAt: { gte: q.from, lte: q.to },
      },
      include: { location: { select: { title: true } }, _count: { select: { registrations: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'WAITING_PAYMENT'] } } } } } },
      orderBy: { startsAt: 'asc' },
    });
    return rows.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      discipline: t.discipline,
      level: t.level,
      status: t.status,
      startsAt: t.startsAt.toISOString(),
      endsAt: t.endsAt.toISOString(),
      timezone: t.timezone,
      locationTitle: t.location?.title ?? '',
      capacity: t.capacity,
      registeredCount: t._count.registrations,
      formats: t.formats,
      entryFee: t.entryFeeMinor === null ? null : { amountMinor: t.entryFeeMinor, currency: t.currency },
    }));
  }

  async detail(id: string) {
    const t = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        location: true,
        schedule: { orderBy: { sortOrder: 'asc' } },
        rules: { where: { publishedAt: { not: null } }, orderBy: { version: 'desc' }, take: 1 },
        documents: { where: { publishedAt: { not: null } } },
        _count: { select: { registrations: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'WAITING_PAYMENT'] } } } } },
      },
    });
    if (!t) throw new NotFoundException();
    const { _count, entryFeeMinor, ...rest } = t;
    return { ...rest, registeredCount: _count.registrations, locationTitle: t.location?.title ?? '', entryFee: entryFeeMinor === null ? null : { amountMinor: entryFeeMinor, currency: t.currency } };
  }

  async currentRules(tournamentId: string) {
    const rules = await this.prisma.tournamentRules.findFirst({
      where: { tournamentId, publishedAt: { not: null } },
      orderBy: { version: 'desc' },
    });
    if (!rules) throw new NotFoundException('Регламент не опубликован');
    return rules;
  }

  /** Создание черновика организатором. Коэффициент фиксируется из правил сезона при создании. */
  async create(actorId: string, dto: UpsertTournament) {
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    if (!season) throw new BadRequestException('Нет активного сезона');
    const rules = await this.prisma.rankingRules.findFirst({ where: { seasonId: season.id, OR: [{ discipline: dto.discipline }, { discipline: null }] }, orderBy: { activeFrom: 'desc' } });
    const coefficient = (rules?.payload as { levelCoefficients?: Record<string, number> } | null)?.levelCoefficients?.[dto.level] ?? 1;
    const base = dto.title.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/(^-|-$)/g, '');
    const slug = `${base}-${new Date(dto.startsAt).toISOString().slice(0, 10)}`;
    const { location, schedule, ...fields } = dto;

    const created = await this.prisma.tournament.create({
      data: {
        ...fields,
        seasonId: season.id,
        slug,
        coefficient,
        createdBy: actorId,
        location: { create: location },
        schedule: { create: schedule.map((s, i) => ({ ...s, sortOrder: i })) },
      },
    });
    await this.prisma.auditLog.create({ data: { actorId, action: 'tournament.create', entityType: 'tournament', entityId: created.id, after: dto } });
    return this.detail(created.id);
  }

  async update(id: string, actorId: string, dto: Partial<UpsertTournament>) {
    const before = await this.prisma.tournament.findUnique({ where: { id }, select: { status: true } });
    if (!before) throw new NotFoundException();
    if (['FINALIZED', 'ARCHIVED'].includes(before.status)) throw new BadRequestException('Финализированный турнир не редактируется');
    const { location, schedule, ...fields } = dto;
    await this.prisma.$transaction(async (tx) => {
      await tx.tournament.update({ where: { id }, data: fields });
      if (location) await tx.tournamentLocation.upsert({ where: { tournamentId: id }, create: { tournamentId: id, ...location }, update: location });
      if (schedule) {
        await tx.tournamentScheduleItem.deleteMany({ where: { tournamentId: id } });
        await tx.tournamentScheduleItem.createMany({ data: schedule.map((s, i) => ({ tournamentId: id, ...s, sortOrder: i })) });
      }
      await tx.auditLog.create({ data: { actorId, action: 'tournament.update', entityType: 'tournament', entityId: id, after: dto } });
    });
    return this.detail(id);
  }

  /** Регламент версионируется: каждое сохранение — новая версия. */
  async createRulesVersion(tournamentId: string, actorId: string, dto: UpsertRules) {
    const last = await this.prisma.tournamentRules.findFirst({ where: { tournamentId }, orderBy: { version: 'desc' }, select: { version: true } });
    const { publish, ...fields } = dto;
    const rules = await this.prisma.tournamentRules.create({
      data: { tournamentId, version: (last?.version ?? 0) + 1, ...fields, publishedAt: publish ? new Date() : null },
    });
    await this.prisma.auditLog.create({ data: { actorId, action: 'tournament.rules', entityType: 'tournament', entityId: tournamentId, after: { version: rules.version, publish } } });
    return rules;
  }

  async publicParticipants(tournamentId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId }, select: { seasonId: true, discipline: true } });
    if (!t) throw new NotFoundException();
    const regs = await this.prisma.registration.findMany({
      where: { tournamentId, status: { in: ['CONFIRMED', 'CHECKED_IN', 'FINISHED'] } },
      include: { members: { where: { invitationStatus: 'ACCEPTED' }, include: { user: { include: { profile: { select: { displayName: true, city: { select: { name: true } } } } } } } } },
      orderBy: [{ startNumber: 'asc' }, { createdAt: 'asc' }],
    });
    const userIds = regs.flatMap((r) => r.members.map((m) => m.userId)).filter((id): id is string => !!id);
    const ranks = await this.prisma.rankingEntry.findMany({ where: { seasonId: t.seasonId, discipline: t.discipline, userId: { in: userIds } } });
    const rankOf = new Map(ranks.map((r) => [r.userId, r.rank]));
    return regs.map((r) => ({
      registrationId: r.id,
      format: r.format,
      status: r.status,
      startNumber: r.startNumber,
      members: r.members.map((m) => ({ userId: m.userId, displayName: m.user?.profile?.displayName ?? 'Участник', city: m.user?.profile?.city?.name ?? null, rank: m.userId ? (rankOf.get(m.userId) ?? null) : null, role: m.role })),
    }));
  }

  registrations(tournamentId: string) {
    return this.prisma.registration.findMany({
      where: { tournamentId },
      include: { owner: { include: { profile: { select: { displayName: true } } } }, members: { include: { user: { include: { profile: { select: { displayName: true } } } } } }, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async transition(id: string, to: TournamentStatus, actorId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id }, select: { status: true } });
    if (!t) throw new NotFoundException();
    if (!tournamentMachine.canTransition(t.status, to)) {
      throw new BadRequestException(`Переход ${t.status} → ${to} недопустим`);
    }
    if (to === 'REGISTRATION_OPEN' && !(await this.prisma.tournamentRules.findFirst({ where: { tournamentId: id, publishedAt: { not: null } } }))) {
      throw new BadRequestException('Нельзя открыть регистрацию без опубликованного регламента');
    }
    // финализация: протокол, очки, уведомления — до смены статуса, чтобы при ошибке турнир остался в JUDGING
    if (to === 'FINALIZED') await this.finalization.finalize(id, actorId);
    return this.prisma.$transaction([
      this.prisma.tournament.update({ where: { id }, data: { status: to } }),
      this.prisma.auditLog.create({
        data: { actorId, action: 'tournament.transition', entityType: 'tournament', entityId: id, before: { status: t.status }, after: { status: to } },
      }),
    ]);
  }
}
