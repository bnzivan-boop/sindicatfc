import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Discipline } from '@sindikat/domain';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async names(ids: string[]) {
    const rows = await this.prisma.userProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, displayName: true, city: { select: { name: true } }, user: { select: { disciplines: { orderBy: { priority: 'asc' }, take: 1 } } } } });
    return new Map(rows.map((r) => [r.userId, { displayName: r.displayName, city: r.city?.name ?? null, discipline: r.user.disciplines[0]?.discipline ?? null }]));
  }

  /* ── выезды ── */
  async trips(viewerId?: string) {
    const rows = await this.prisma.trip.findMany({ where: { cancelledAt: null, startsAt: { gte: new Date(Date.now() - 6 * 3600_000) } }, include: { members: true }, orderBy: { startsAt: 'asc' }, take: 50 });
    const by = await this.names(rows.map((t) => t.authorId));
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    const ranks = season ? await this.prisma.rankingEntry.findMany({ where: { seasonId: season.id, userId: { in: rows.map((t) => t.authorId) } } }) : [];
    return rows.map((t) => {
      const accepted = t.members.filter((m) => m.status === 'ACCEPTED').length;
      const mine = viewerId ? t.members.find((m) => m.userId === viewerId) : undefined;
      const a = by.get(t.authorId);
      const rank = ranks.find((r) => r.userId === t.authorId && r.discipline === (t.discipline ?? a?.discipline));
      return { id: t.id, title: t.title, place: t.place, startsAt: t.startsAt, seats: t.seats, seatsLeft: Math.max(0, t.seats - accepted), details: t.details, discipline: t.discipline, author: { id: t.authorId, displayName: a?.displayName ?? 'Участник', meta: rank ? `${rank.discipline} №${rank.rank}` : (a?.city ?? '') }, isAuthor: t.authorId === viewerId, myStatus: mine?.status ?? null, requests: t.authorId === viewerId ? t.members.filter((m) => m.status === 'REQUESTED').map((m) => m.userId) : [] };
    });
  }

  async createTrip(authorId: string, dto: { title: string; place: string; startsAt: string; seats: number; details?: string; discipline?: Discipline }) {
    return this.prisma.trip.create({ data: { authorId, title: dto.title, place: dto.place, startsAt: new Date(dto.startsAt), seats: dto.seats, details: dto.details, discipline: dto.discipline } });
  }

  async toggleTripRequest(userId: string, tripId: string) {
    const t = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!t) throw new NotFoundException();
    if (t.authorId === userId) throw new BadRequestException('Вы организатор этого выезда');
    const existing = await this.prisma.tripMember.findUnique({ where: { tripId_userId: { tripId, userId } } });
    if (existing?.status === 'INVITED') {
      await this.prisma.tripMember.update({ where: { tripId_userId: { tripId, userId } }, data: { status: 'ACCEPTED' } });
      const n = await this.names([userId]);
      await this.notifications.send(t.authorId, 'registration.confirmed', `${n.get(userId)?.displayName ?? 'Участник'} едет с вами`, `${t.title} · ${t.place}`, { tripId });
      return { status: 'ACCEPTED' };
    }
    if (existing) { await this.prisma.tripMember.delete({ where: { tripId_userId: { tripId, userId } } }); return { status: null }; }
    await this.prisma.tripMember.create({ data: { tripId, userId } });
    const n = await this.names([userId]);
    await this.notifications.send(t.authorId, 'registration.invited', `${n.get(userId)?.displayName ?? 'Участник'} хочет присоединиться`, `${t.title} · ${t.place}`, { tripId });
    return { status: 'REQUESTED' };
  }

  async inviteToTrip(authorId: string, tripId: string, userId: string) {
    const t = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!t || t.authorId !== authorId) throw new ForbiddenException();
    if (userId === authorId) throw new BadRequestException();
    await this.prisma.tripMember.upsert({ where: { tripId_userId: { tripId, userId } }, create: { tripId, userId, status: 'INVITED' }, update: {} });
    const n = await this.names([authorId]);
    await this.notifications.send(userId, 'trip.invited', `${n.get(authorId)?.displayName ?? 'Участник'} зовёт на рыбалку`, `${t.title} · ${t.place}`, { tripId });
    return { status: 'INVITED' };
  }

  async decideTrip(authorId: string, tripId: string, dto: { userId: string; accept: boolean }) {
    const t = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!t || t.authorId !== authorId) throw new ForbiddenException();
    await this.prisma.tripMember.update({ where: { tripId_userId: { tripId, userId: dto.userId } }, data: { status: dto.accept ? 'ACCEPTED' : 'DECLINED' } });
    await this.notifications.send(dto.userId, 'registration.confirmed', dto.accept ? 'Вас взяли на выезд' : 'Организатор выезда отказал', `${t.title} · ${t.place}`, { tripId });
    return { ok: true };
  }

  /** Подбор компании: участники той же основной дисциплины и города, с рейтингом; простая эвристика вместо ML. */
  async matches(viewerId?: string) {
    const me = viewerId ? await this.prisma.user.findUnique({ where: { id: viewerId }, include: { profile: true, disciplines: { orderBy: { priority: 'asc' } } } }) : null;
    const myDisc = me?.disciplines.map((d) => d.discipline) ?? [];
    const candidates = await this.prisma.userProfile.findMany({ where: { onboardingCompletedAt: { not: null }, userId: { not: viewerId ?? '' }, user: { status: 'ACTIVE' } }, include: { city: true, user: { include: { disciplines: true, rankings: true } } }, take: 60 });
    return candidates.map((c) => {
      const shared = c.user.disciplines.filter((d) => myDisc.includes(d.discipline)).map((d) => d.discipline);
      const sameCity = !!me?.profile?.cityId && c.cityId === me.profile.cityId;
      const score = Math.min(98, 35 + shared.length * 18 + (sameCity ? 15 : 0) + Math.min(9, c.user.rankings.length * 3) + (c.experienceYears ? Math.min(8, Math.round(c.experienceYears / 2)) : 0));
      return { id: c.userId, displayName: c.displayName, city: c.city?.name ?? null, score, reasons: [...shared.map((d) => d.toLowerCase()), ...(sameCity ? ['ваш город'] : []), ...(c.experienceYears ? [`опыт ${c.experienceYears} лет`] : [])].slice(0, 4) };
    }).sort((a, b) => b.score - a.score).slice(0, 12);
  }

  /* ── клубы ── */
  private async clubPoints(clubIds: string[]) {
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    const members = await this.prisma.clubMember.findMany({ where: { clubId: { in: clubIds }, role: { in: ['CAPTAIN', 'ATHLETE'] } } });
    const entries = season ? await this.prisma.rankingEntry.findMany({ where: { seasonId: season.id, userId: { in: members.map((m) => m.userId) } } }) : [];
    const pts = new Map<string, number>();
    for (const m of members) pts.set(m.clubId, (pts.get(m.clubId) ?? 0) + entries.filter((e) => e.userId === m.userId).reduce((s, e) => s + Number(e.points), 0));
    return pts;
  }

  async clubs(viewerId?: string) {
    const rows = await this.prisma.club.findMany({ include: { _count: { select: { members: { where: { role: { in: ['CAPTAIN', 'ATHLETE'] } } } } }, members: viewerId ? { where: { userId: viewerId } } : false }, orderBy: { createdAt: 'asc' } });
    const pts = await this.clubPoints(rows.map((c) => c.id));
    const ranked = [...rows].sort((a, b) => (pts.get(b.id) ?? 0) - (pts.get(a.id) ?? 0));
    return rows.map((c) => ({ id: c.id, name: c.name, city: c.city, discipline: c.discipline, recruiting: c.recruiting, members: c._count.members, points: Math.round(pts.get(c.id) ?? 0), rank: ranked.findIndex((x) => x.id === c.id) + 1, myRole: Array.isArray(c.members) ? (c.members[0]?.role ?? null) : null }));
  }

  async club(id: string, viewerId?: string) {
    const c = await this.prisma.club.findUnique({ where: { id }, include: { members: true, slots: true } });
    if (!c) throw new NotFoundException();
    const by = await this.names(c.members.map((m) => m.userId));
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    const entries = season ? await this.prisma.rankingEntry.findMany({ where: { seasonId: season.id, discipline: c.discipline, userId: { in: c.members.map((m) => m.userId) } } }) : [];
    const finished = season ? await this.prisma.registration.findMany({ where: { status: 'FINISHED', ownerId: { in: c.members.filter((m) => m.role !== 'APPLICANT').map((m) => m.userId) }, tournament: { seasonId: season.id, discipline: c.discipline } }, include: { tournament: { select: { id: true, snapshots: { where: { isFinal: true }, take: 1, select: { payload: true } } } } } }) : [];
    const places = finished.map((r) => ((r.tournament.snapshots[0]?.payload ?? []) as Array<{ participantId: string; place: number }>).find((e) => e.participantId === r.ownerId)?.place ?? null);
    const all = await this.clubs(viewerId);
    const me = all.find((x) => x.id === id);
    const isCaptain = c.captainId === viewerId;
    return {
      id: c.id, name: c.name, city: c.city, discipline: c.discipline, recruiting: c.recruiting, description: c.description, foundedYear: c.foundedYear, points: me?.points ?? 0, rank: me?.rank ?? null, myRole: me?.myRole ?? null, isCaptain,
      roster: c.members.filter((m) => m.role !== 'APPLICANT').map((m) => ({ userId: m.userId, displayName: by.get(m.userId)?.displayName ?? 'Участник', role: m.role, rank: entries.find((e) => e.userId === m.userId)?.rank ?? null, points: Math.round(Number(entries.find((e) => e.userId === m.userId)?.points ?? 0)) })).sort((a, b) => (a.role === 'CAPTAIN' ? -1 : b.role === 'CAPTAIN' ? 1 : (a.rank ?? 999) - (b.rank ?? 999))),
      applicants: isCaptain ? c.members.filter((m) => m.role === 'APPLICANT').map((m) => ({ userId: m.userId, displayName: by.get(m.userId)?.displayName ?? 'Участник' })) : [],
      slots: c.slots, wins: places.filter((p) => p === 1).length, podiums: places.filter((p) => p !== null && p <= 3).length, starts: new Set(finished.map((r) => r.tournament.id)).size,
    };
  }

  async createClub(captainId: string, dto: { name: string; city?: string; discipline: Discipline; recruiting: boolean; description?: string }) {
    const slug = `${dto.name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
    return this.prisma.club.create({ data: { slug, name: dto.name, city: dto.city, discipline: dto.discipline, recruiting: dto.recruiting, description: dto.description, captainId, foundedYear: new Date().getFullYear(), members: { create: { userId: captainId, role: 'CAPTAIN' } } } });
  }

  async toggleClubApplication(userId: string, clubId: string) {
    const c = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!c) throw new NotFoundException();
    const existing = await this.prisma.clubMember.findUnique({ where: { clubId_userId: { clubId, userId } } });
    if (existing?.role === 'CAPTAIN') throw new BadRequestException('Вы капитан клуба');
    if (existing) { await this.prisma.clubMember.delete({ where: { clubId_userId: { clubId, userId } } }); return { role: null }; }
    if (!c.recruiting) throw new BadRequestException('Набор в клуб закрыт');
    await this.prisma.clubMember.create({ data: { clubId, userId, role: 'APPLICANT' } });
    const n = await this.names([userId]);
    await this.notifications.send(c.captainId, 'registration.invited', `${n.get(userId)?.displayName ?? 'Участник'} подал заявку в клуб`, c.name, { clubId });
    return { role: 'APPLICANT' };
  }

  async decideClub(captainId: string, clubId: string, dto: { userId: string; accept: boolean }) {
    const c = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!c || c.captainId !== captainId) throw new ForbiddenException();
    if (dto.accept) await this.prisma.clubMember.update({ where: { clubId_userId: { clubId, userId: dto.userId } }, data: { role: 'ATHLETE' } });
    else await this.prisma.clubMember.delete({ where: { clubId_userId: { clubId, userId: dto.userId } } });
    await this.notifications.send(dto.userId, 'registration.confirmed', dto.accept ? `Вы приняты в ${c.name}` : `${c.name}: заявка отклонена`, '', { clubId });
    return { ok: true };
  }
}
