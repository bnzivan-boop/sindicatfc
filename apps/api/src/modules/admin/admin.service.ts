import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Discipline, PaginationQuery, RankingRules, Role, RoleScopeType } from '@sindikat/domain';
import type { Prisma } from '../../../generated/prisma/index.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { RankingsService } from '../rankings/rankings.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankings: RankingsService,
  ) {}

  /** Сводка для дашборда: сезон, турниры по статусам, заявки, деньги (по успешным платежам), очереди. */
  async dashboard() {
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    const [byStatus, regs, revenue, pendingJudge, openProtests, users, posts, customGear] = await Promise.all([
      this.prisma.tournament.groupBy({ by: ['status'], where: { seasonId: season?.id }, _count: true }),
      this.prisma.registration.groupBy({ by: ['status'], where: { tournament: { seasonId: season?.id } }, _count: true }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCEEDED', registration: { tournament: { seasonId: season?.id } } }, _sum: { amountMinor: true }, _count: true }),
      this.prisma.result.count({ where: { status: 'PENDING_JUDGE' } }),
      this.prisma.protest.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.gearCustomRequest.count({ where: { resolvedModelId: null } }),
    ]);
    const upcoming = await this.prisma.tournament.findMany({ where: { seasonId: season?.id, startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 5, include: { _count: { select: { registrations: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } } } } } } });
    const live = await this.prisma.tournament.findMany({ where: { status: { in: ['LIVE', 'JUDGING'] } }, include: { _count: { select: { results: { where: { status: 'PENDING_JUDGE' } } } } } });
    return {
      season: season ? { id: season.id, year: season.year, title: season.title } : null,
      tournaments: Object.fromEntries(byStatus.map((b) => [b.status, b._count])),
      registrations: Object.fromEntries(regs.map((r) => [r.status, r._count])),
      revenueMinor: revenue._sum.amountMinor ?? 0, payments: revenue._count,
      pendingJudge, openProtests, users, posts, customGear,
      upcoming: upcoming.map((t) => ({ id: t.id, title: t.title, startsAt: t.startsAt, status: t.status, discipline: t.discipline, confirmed: t._count.registrations, capacity: t.capacity })),
      live: live.map((t) => ({ id: t.id, title: t.title, status: t.status, pendingJudge: t._count.results })),
    };
  }

  /* ── пользователи ── */
  async users(q: { q?: string; role?: Role; limit: number }) {
    const rows = await this.prisma.user.findMany({
      where: { ...(q.q ? { OR: [{ phone: { contains: q.q } }, { profile: { displayName: { contains: q.q, mode: 'insensitive' } } }] } : {}), ...(q.role ? { roles: { some: { role: q.role } } } : {}) },
      include: { profile: { select: { displayName: true, city: { select: { name: true } } } }, roles: true, _count: { select: { registrations: true } } },
      orderBy: { createdAt: 'desc' }, take: q.limit,
    });
    return rows.map((u) => ({ id: u.id, phone: u.phone, status: u.status, displayName: u.profile?.displayName ?? null, city: u.profile?.city?.name ?? null, roles: u.roles.map((r) => ({ id: r.id, role: r.role, scopeType: r.scopeType, scopeId: r.scopeId })), registrations: u._count.registrations, createdAt: u.createdAt, lastSeenAt: u.lastSeenAt }));
  }

  async user(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, include: { profile: { include: { city: true } }, roles: true, disciplines: true, devices: { select: { platform: true, lastSeenAt: true, pushToken: true } }, registrations: { include: { tournament: { select: { id: true, title: true, startsAt: true } }, payments: { take: 1, orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' }, take: 30 }, rankings: true, consents: true } });
    if (!u) throw new NotFoundException();
    const audit = await this.prisma.auditLog.findMany({ where: { OR: [{ actorId: id }, { entityId: id }] }, orderBy: { createdAt: 'desc' }, take: 20 });
    return { ...u, devices: u.devices.map((d) => ({ platform: d.platform, lastSeenAt: d.lastSeenAt, hasPush: !!d.pushToken })), audit };
  }

  async setStatus(actorId: string, userId: string, status: 'ACTIVE' | 'BLOCKED') {
    const u = await this.prisma.user.update({ where: { id: userId }, data: { status } });
    if (status === 'BLOCKED') await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { actorId, action: `user.${status.toLowerCase()}`, entityType: 'user', entityId: userId } });
    return { id: u.id, status: u.status };
  }

  async grantRole(actorId: string, dto: { userId: string; role: Role; scopeType: RoleScopeType; scopeId?: string }) {
    const scopeId = dto.scopeId ?? null;
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.userRole.findFirst({ where: { userId: dto.userId, role: dto.role, scopeType: dto.scopeType, scopeId } });
      const role = existing ? await tx.userRole.update({ where: { id: existing.id }, data: { grantedBy: actorId } }) : await tx.userRole.create({ data: { userId: dto.userId, role: dto.role, scopeType: dto.scopeType, scopeId, grantedBy: actorId } });
      await tx.auditLog.create({ data: { actorId, action: 'role.grant', entityType: 'user', entityId: dto.userId, after: { ...dto, scopeId } } });
      return role;
    });
  }

  async revokeRole(actorId: string, roleId: string) {
    const r = await this.prisma.userRole.findUnique({ where: { id: roleId } });
    if (!r) throw new NotFoundException();
    if (r.role === 'USER') throw new BadRequestException('Базовую роль USER отозвать нельзя');
    await this.prisma.userRole.delete({ where: { id: roleId } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'role.revoke', entityType: 'user', entityId: r.userId, before: { role: r.role, scopeType: r.scopeType, scopeId: r.scopeId } } });
  }

  /* ── сезоны и правила ── */
  seasons() {
    return this.prisma.season.findMany({ orderBy: { year: 'desc' }, include: { _count: { select: { tournaments: true } }, rankingRules: { orderBy: { activeFrom: 'desc' }, take: 1, select: { version: true, activeFrom: true } } } });
  }

  async createSeason(actorId: string, dto: { year: number; title: string; startsAt: string; endsAt: string }) {
    const s = await this.prisma.season.create({ data: { year: dto.year, title: dto.title, startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt) } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'season.create', entityType: 'season', entityId: s.id, after: dto } });
    return s;
  }

  async activateSeason(actorId: string, id: string) {
    await this.prisma.$transaction([this.prisma.season.updateMany({ data: { isActive: false } }), this.prisma.season.update({ where: { id }, data: { isActive: true } }), this.prisma.auditLog.create({ data: { actorId, action: 'season.activate', entityType: 'season', entityId: id } })]);
    return { id, isActive: true };
  }

  rankingRules(seasonId: string) {
    return this.prisma.rankingRules.findMany({ where: { seasonId }, orderBy: [{ discipline: 'asc' }, { activeFrom: 'desc' }] });
  }

  /** Новая версия правил — коэффициенты живут здесь, не в коде (handoff §10). Проекция рейтинга пересобирается. */
  async createRankingRules(actorId: string, seasonId: string, dto: { discipline: Discipline | null; note?: string } & Omit<RankingRules, 'version' | 'seasonId'>) {
    const last = await this.prisma.rankingRules.findFirst({ where: { seasonId, discipline: dto.discipline }, orderBy: { activeFrom: 'desc' } });
    const season = await this.prisma.season.findUniqueOrThrow({ where: { id: seasonId } });
    const n = last ? Number(last.version.split('.')[1] ?? 0) + 1 : 1;
    const version = `${season.year}.${n}`;
    const { note, discipline, ...rules } = dto;
    const payload: RankingRules = { ...rules, version, seasonId };
    const row = await this.prisma.rankingRules.create({ data: { seasonId, discipline, version, activeFrom: new Date(), payload: payload as unknown as Prisma.InputJsonObject } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'ranking_rules.create', entityType: 'season', entityId: seasonId, after: { version, discipline, note, levelCoefficients: rules.levelCoefficients } } });
    return row;
  }

  async ledger(seasonId: string, q: { userId?: string; discipline?: Discipline; limit: number }) {
    const rows = await this.prisma.rankingLedger.findMany({ where: { seasonId, userId: q.userId, discipline: q.discipline }, include: { user: { include: { profile: { select: { displayName: true } } } }, tournament: { select: { title: true } } }, orderBy: { createdAt: 'desc' }, take: q.limit });
    return rows.map((r) => ({ id: r.id, user: r.user.profile?.displayName ?? r.userId, userId: r.userId, discipline: r.discipline, tournament: r.tournament?.title ?? null, type: r.type, delta: Number(r.delta), rulesVersion: r.rulesVersion, reason: r.reason, createdAt: r.createdAt, breakdown: r.breakdown }));
  }

  /** Ручная корректировка — только новой записью ledger с причиной; затем пересборка проекции. */
  async adjustPoints(actorId: string, seasonId: string, dto: { userId: string; discipline: Discipline; delta: number; reason: string; tournamentId?: string }) {
    const rules = await this.prisma.rankingRules.findFirst({ where: { seasonId, OR: [{ discipline: dto.discipline }, { discipline: null }] }, orderBy: { activeFrom: 'desc' } });
    const entry = await this.prisma.rankingLedger.create({ data: { userId: dto.userId, seasonId, discipline: dto.discipline, tournamentId: dto.tournamentId, type: dto.delta >= 0 ? 'BONUS' : 'PENALTY', delta: dto.delta, rulesVersion: rules?.version ?? 'manual', reason: dto.reason, authorId: actorId } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'ranking.adjust', entityType: 'user', entityId: dto.userId, after: dto } });
    await this.rankings.rebuild(seasonId);
    return entry;
  }

  /* ── справочники ── */
  species() { return this.prisma.fishSpecies.findMany({ orderBy: { nameRu: 'asc' }, include: { _count: { select: { catches: true, results: true } } } }); }
  createSpecies(dto: { slug: string; nameRu: string; nameLat?: string; isPredator: boolean }) { return this.prisma.fishSpecies.create({ data: dto }); }
  updateSpecies(id: string, dto: Partial<{ slug: string; nameRu: string; nameLat?: string; isPredator: boolean }>) { return this.prisma.fishSpecies.update({ where: { id }, data: dto }); }

  pendingGearRequests() {
    return this.prisma.gearCustomRequest.findMany({ where: { resolvedModelId: null }, orderBy: { createdAt: 'asc' } });
  }

  async approveGearRequest(actorId: string, id: string, dto: { brandName: string; modelName: string }) {
    const req = await this.prisma.gearCustomRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException();
    const brand = await this.prisma.gearBrand.upsert({ where: { name: dto.brandName }, create: { name: dto.brandName }, update: {} });
    const model = await this.prisma.gearModel.upsert({ where: { brandId_type_name: { brandId: brand.id, type: req.type, name: dto.modelName } }, create: { brandId: brand.id, type: req.type, name: dto.modelName }, update: {} });
    await this.prisma.gearCustomRequest.update({ where: { id }, data: { resolvedModelId: model.id } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'gear.catalog.approve', entityType: 'gear_model', entityId: model.id, after: dto } });
    return model;
  }

  gearCatalog() { return this.prisma.gearBrand.findMany({ orderBy: { name: 'asc' }, include: { models: { orderBy: { name: 'asc' } } } }); }

  recentPosts() {
    return this.prisma.post.findMany({ include: { channel: { select: { name: true } }, _count: { select: { likes: true, comments: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }).then(async (rows) => {
      const authors = await this.prisma.userProfile.findMany({ where: { userId: { in: rows.map((r) => r.authorId) } }, select: { userId: true, displayName: true } });
      const by = new Map(authors.map((a) => [a.userId, a.displayName]));
      return rows.map((p) => ({ id: p.id, title: p.title, channel: p.channel.name, author: by.get(p.authorId) ?? p.authorId, createdAt: p.createdAt, deletedAt: p.deletedAt, likes: p._count.likes, comments: p._count.comments }));
    });
  }

  async auditLog(q: PaginationQuery) {
    const items = await this.prisma.auditLog.findMany({ take: q.limit + 1, ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}), orderBy: { createdAt: 'desc' }, include: { actor: { include: { profile: { select: { displayName: true } } } } } });
    const nextCursor = items.length > q.limit ? items.pop()!.id : null;
    return { items: items.map((a) => ({ ...a, actorName: a.actor?.profile?.displayName ?? null })), nextCursor };
  }
}
