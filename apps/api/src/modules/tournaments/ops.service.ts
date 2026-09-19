import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/index.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import type { OpsInput } from './ops.controller.js';
import { RULES } from './rules-templates.js';

/** Стартовый чек-лист из концепции («Юридические контрольные окна») и прототипа. */
export const DEFAULT_CHECKLIST = [
  { key: 'spawning', title: 'нерестовые ограничения', note: 'дата вне окна 1 апреля — 10 июня', status: 'TODO' },
  { key: 'winter-pits', title: 'зимовальные ямы', note: 'актуально после 1 октября', status: 'TODO' },
  { key: 'protected-areas', title: 'ООПТ и правила вылова региона', note: 'проверить границы зоны', status: 'TODO' },
  { key: 'shore-owner', title: 'согласование владельца берега / площадки', note: '', status: 'TODO' },
  { key: 'medic', title: 'медицинский пост', note: 'подрядчик и схема', status: 'TODO' },
  { key: 'safety', title: 'безопасность: судьи, связь, спасатели', note: '', status: 'TODO' },
  { key: 'reserve-date', title: 'резервная дата', note: '', status: 'TODO' },
  { key: 'rules-published', title: 'регламент опубликован', note: '', status: 'TODO' },
] as const;

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getOps(tournamentId: string) {
    const ops = await this.prisma.tournamentOps.findUnique({ where: { tournamentId } });
    if (ops) return ops;
    const rules = await this.prisma.tournamentRules.count({ where: { tournamentId, publishedAt: { not: null } } });
    const checklist = DEFAULT_CHECKLIST.map((c) => (c.key === 'rules-published' && rules > 0 ? { ...c, status: 'DONE' } : c));
    return { tournamentId, checklist, budget: [], partners: [], prizeFundMinor: null, notes: null, updatedAt: null };
  }

  async putOps(tournamentId: string, actorId: string, dto: OpsInput) {
    const data = { checklist: dto.checklist as unknown as Prisma.InputJsonValue, budget: dto.budget as unknown as Prisma.InputJsonValue, partners: dto.partners as unknown as Prisma.InputJsonValue, prizeFundMinor: dto.prizeFundMinor ?? null, notes: dto.notes ?? null };
    const ops = await this.prisma.tournamentOps.upsert({ where: { tournamentId }, create: { tournamentId, ...data }, update: data });
    await this.prisma.auditLog.create({ data: { actorId, action: 'tournament.ops', entityType: 'tournament', entityId: tournamentId } });
    return ops;
  }

  markers(tournamentId: string) {
    return this.prisma.competitionMarker.findMany({ where: { tournamentId }, orderBy: { validFrom: 'asc' } });
  }

  async addMarker(tournamentId: string, actorId: string, dto: { code: string; validFrom: string; validTo: string }) {
    const m = await this.prisma.competitionMarker.create({ data: { tournamentId, code: dto.code.toUpperCase(), validFrom: new Date(dto.validFrom), validTo: new Date(dto.validTo) } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'tournament.marker', entityType: 'tournament', entityId: tournamentId, after: { code: m.code } } });
    return m;
  }

  async allResults(tournamentId: string) {
    const rows = await this.prisma.result.findMany({
      where: { tournamentId },
      include: { species: true, participant: { include: { profile: { select: { displayName: true } } } }, decisions: { orderBy: { createdAt: 'desc' }, take: 1, include: { judge: { include: { profile: { select: { displayName: true } } } } } }, media: { include: { file: true }, take: 1 }, corrections: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { submittedAt: 'desc' },
    });
    return Promise.all(rows.map(async (r) => ({
      id: r.id, participant: r.participant.profile?.displayName ?? '—', participantId: r.participantId, species: r.species.nameRu, lengthMm: r.lengthMm, weightG: r.weightG, status: r.status, markerCode: r.markerCode, capturedAt: r.capturedAt, submittedAt: r.submittedAt,
      judge: r.decisions[0]?.judge.profile?.displayName ?? null, decision: r.decisions[0]?.decision ?? null, reason: r.decisions[0]?.reason ?? null, corrected: r.corrections[0]?.reason ?? null,
      photoUrl: r.media[0] ? await this.storage.createReadUrl(r.media[0].file.objectKey, 'private') : null,
    })));
  }

  waitlist(tournamentId: string) {
    return this.prisma.waitlistEntry.findMany({ where: { tournamentId }, orderBy: { position: 'asc' } }).then(async (rows) => {
      const profiles = await this.prisma.userProfile.findMany({ where: { userId: { in: rows.map((r) => r.userId) } }, select: { userId: true, displayName: true } });
      const by = new Map(profiles.map((p) => [p.userId, p.displayName]));
      return rows.map((r) => ({ ...r, displayName: by.get(r.userId) ?? '—' }));
    });
  }

  async duplicate(tournamentId: string, actorId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId }, include: { location: true, schedule: true, rules: { orderBy: { version: 'desc' }, take: 1 } } });
    if (!t) throw new NotFoundException();
    const shift = 7 * 86_400_000;
    const { id: _id, slug, createdAt: _c, updatedAt: _u, location, schedule, rules, ...fields } = t;
    const copy = await this.prisma.tournament.create({
      data: {
        ...fields,
        slug: `${slug}-copy-${Date.now().toString(36)}`,
        title: `${t.title} (копия)`,
        status: 'DRAFT',
        createdBy: actorId,
        startsAt: new Date(t.startsAt.getTime() + shift), endsAt: new Date(t.endsAt.getTime() + shift),
        registrationOpensAt: t.registrationOpensAt ? new Date(t.registrationOpensAt.getTime() + shift) : null,
        registrationClosesAt: t.registrationClosesAt ? new Date(t.registrationClosesAt.getTime() + shift) : null,
        reserveDate: t.reserveDate ? new Date(t.reserveDate.getTime() + shift) : null,
        location: location ? { create: { title: location.title, address: location.address, meetingPoint: location.meetingPoint, parking: location.parking } } : undefined,
        schedule: { create: schedule.map((s) => ({ at: new Date(s.at.getTime() + shift), title: s.title, sortOrder: s.sortOrder })) },
        rules: rules[0] ? { create: { version: 1, allowedTackle: rules[0].allowedTackle, forbiddenTackle: rules[0].forbiddenTackle, scoringSummary: rules[0].scoringSummary, fixationSummary: rules[0].fixationSummary, penalties: rules[0].penalties, scoringParams: rules[0].scoringParams as Prisma.InputJsonValue, publishedAt: null } } : undefined,
      },
    });
    await this.prisma.auditLog.create({ data: { actorId, action: 'tournament.duplicate', entityType: 'tournament', entityId: copy.id, before: { from: tournamentId } } });
    return copy;
  }

  async applyRulesTemplate(tournamentId: string, actorId: string, discipline?: keyof typeof RULES) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException();
    const tpl = RULES[discipline ?? t.discipline];
    const last = await this.prisma.tournamentRules.findFirst({ where: { tournamentId }, orderBy: { version: 'desc' } });
    const rules = await this.prisma.tournamentRules.create({ data: { tournamentId, version: (last?.version ?? 0) + 1, allowedTackle: tpl.allowedTackle, forbiddenTackle: tpl.forbiddenTackle, scoringSummary: tpl.scoringSummary, fixationSummary: tpl.fixationSummary, penalties: tpl.penalties, scoringParams: tpl.scoringParams, publishedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { actorId, action: 'tournament.rules.template', entityType: 'tournament', entityId: tournamentId, after: { version: rules.version, discipline: discipline ?? t.discipline } } });
    return rules;
  }
}
