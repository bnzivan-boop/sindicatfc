import { Injectable, NotFoundException } from '@nestjs/common';
import { calculatePoints, projectTotals, type Discipline, type LedgerEntry, type RankingRules, type TournamentLevel } from '@sindikat/domain';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async table(q: { season?: number; discipline: Discipline }) {
    const season = q.season
      ? await this.prisma.season.findUnique({ where: { year: q.season } })
      : await this.prisma.season.findFirst({ where: { isActive: true } });
    if (!season) throw new NotFoundException('Сезон не найден');
    return this.prisma.rankingEntry.findMany({
      where: { seasonId: season.id, discipline: q.discipline },
      include: { user: { include: { profile: { select: { displayName: true, cityId: true } } } } },
      orderBy: { rank: 'asc' },
      take: 200,
    });
  }

  /** Начисление за финализированный турнир: одна запись ledger на участника. */
  async awardTournament(tournamentId: string, placements: Array<{ userId: string; place: number }>, actorId: string) {
    const t = await this.prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
    const rules = await this.activeRules(t.seasonId, t.discipline);
    const fieldSize = placements.length;

    await this.prisma.rankingLedger.createMany({
      data: placements.map((p) => {
        const breakdown = calculatePoints(rules, { place: p.place, fieldSize, level: t.level as TournamentLevel, discipline: t.discipline });
        return {
          userId: p.userId,
          seasonId: t.seasonId,
          discipline: t.discipline,
          tournamentId,
          type: 'TOURNAMENT_RESULT' as const,
          delta: breakdown.total,
          rulesVersion: rules.version,
          breakdown: { ...breakdown },
          authorId: actorId,
        };
      }),
    });
    await this.rebuild(t.seasonId);
  }

  /** Проекция ranking_entries из ranking_ledger. */
  async rebuild(seasonId: string) {
    const rows = await this.prisma.rankingLedger.findMany({ where: { seasonId } });
    const entries: LedgerEntry[] = rows.map((r) => ({
      id: r.id, userId: r.userId, seasonId: r.seasonId, discipline: r.discipline, tournamentId: r.tournamentId,
      type: r.type, delta: Number(r.delta), rulesVersion: r.rulesVersion, reason: r.reason, authorId: r.authorId,
      reversesLedgerId: r.reversesLedgerId, createdAt: r.createdAt.toISOString(),
    }));
    const totals = projectTotals(entries);
    const starts = new Map<string, Set<string>>();
    for (const e of entries) {
      if (e.type !== 'TOURNAMENT_RESULT' || !e.tournamentId) continue;
      const key = `${e.seasonId}:${e.discipline}:${e.userId}`;
      starts.set(key, (starts.get(key) ?? new Set()).add(e.tournamentId));
    }

    const grouped = new Map<Discipline, Array<{ userId: string; points: number }>>();
    for (const [key, points] of totals) {
      const [, discipline, userId] = key.split(':') as [string, Discipline, string];
      grouped.set(discipline, [...(grouped.get(discipline) ?? []), { userId, points }]);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rankingEntry.deleteMany({ where: { seasonId } });
      for (const [discipline, list] of grouped) {
        list.sort((a, b) => b.points - a.points);
        await tx.rankingEntry.createMany({
          data: list.map((e, i) => ({ userId: e.userId, seasonId, discipline, points: e.points, rank: i + 1, starts: starts.get(`${seasonId}:${discipline}:${e.userId}`)?.size ?? 0 })),
        });
      }
    });
    return { seasonId, disciplines: [...grouped.keys()], users: totals.size };
  }

  private async activeRules(seasonId: string, discipline: Discipline): Promise<RankingRules> {
    const row =
      (await this.prisma.rankingRules.findFirst({ where: { seasonId, discipline, activeFrom: { lte: new Date() } }, orderBy: { activeFrom: 'desc' } })) ??
      (await this.prisma.rankingRules.findFirst({ where: { seasonId, discipline: null, activeFrom: { lte: new Date() } }, orderBy: { activeFrom: 'desc' } }));
    if (!row) throw new NotFoundException('Правила рейтинга сезона не заданы');
    return row.payload as unknown as RankingRules;
  }
}
