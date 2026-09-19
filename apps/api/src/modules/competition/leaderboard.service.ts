import { Injectable, NotFoundException } from '@nestjs/common';
import { scoreLengthSum, type LeaderboardEntry, type LengthSumRules } from '@sindikat/domain';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { RealtimeService } from '../../infra/realtime/realtime.service.js';

/**
 * Live-лидерборд: пересчитывается по принятым результатам и сохраняется снапшотом.
 * MVP поддерживает LENGTH_SUM и TOTAL_WEIGHT; DUEL_POINTS / PLACE_SUM — этап 3+.
 */
@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async current(tournamentId: string): Promise<{ version: number; entries: LeaderboardEntry[]; isFinal: boolean }> {
    const snap = await this.prisma.leaderboardSnapshot.findFirst({ where: { tournamentId }, orderBy: { version: 'desc' } });
    if (!snap) return { version: 0, entries: [], isFinal: false };
    return { version: snap.version, entries: snap.payload as unknown as LeaderboardEntry[], isFinal: snap.isFinal };
  }

  async recompute(tournamentId: string, opts: { final?: boolean } = {}) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { rules: { where: { publishedAt: { not: null } }, orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!tournament) throw new NotFoundException();

    const accepted = await this.prisma.result.findMany({
      where: { tournamentId, status: { in: ['ACCEPTED', 'CORRECTED'] } },
      include: { participant: { include: { profile: { select: { displayName: true } } } } },
    });

    const byParticipant = new Map<string, typeof accepted>();
    for (const r of accepted) byParticipant.set(r.participantId, [...(byParticipant.get(r.participantId) ?? []), r]);

    const scoringParams = (tournament.rules[0]?.scoringParams ?? {}) as Partial<LengthSumRules>;
    const lengthRules: LengthSumRules = { fishCount: scoringParams.fishCount ?? 5, maxPerSpecies: scoringParams.maxPerSpecies ?? null, minLengthMmBySpecies: scoringParams.minLengthMmBySpecies };

    const now = new Date().toISOString();
    const scored = [...byParticipant.entries()].map(([participantId, results]) => {
      const first = results[0]!;
      if (tournament.scoringMode === 'TOTAL_WEIGHT') {
        const total = results.reduce((s, r) => s + (r.weightG ?? 0), 0);
        return { participantId, displayName: first.participant.profile?.displayName ?? '—', score: total, countedFish: results.length, biggestFishMm: null as number | null };
      }
      const s = scoreLengthSum(results.map((r) => ({ resultId: r.id, speciesId: r.speciesId, lengthMm: r.lengthMm ?? 0 })), lengthRules);
      return { participantId, displayName: first.participant.profile?.displayName ?? '—', score: s.totalMm, countedFish: s.counted.length, biggestFishMm: s.biggest?.lengthMm ?? null };
    });

    // TODO(этап 3): tie-breakers из ranking_rules; сейчас — по biggest fish, затем по числу рыб.
    scored.sort((a, b) => b.score - a.score || (b.biggestFishMm ?? 0) - (a.biggestFishMm ?? 0) || b.countedFish - a.countedFish);
    const entries: LeaderboardEntry[] = scored.map((e, i) => ({ place: i + 1, startNumber: null, updatedAt: now, ...e }));

    const last = await this.prisma.leaderboardSnapshot.findFirst({ where: { tournamentId }, orderBy: { version: 'desc' }, select: { version: true } });
    const version = (last?.version ?? 0) + 1;
    await this.prisma.leaderboardSnapshot.create({ data: { tournamentId, version, payload: entries as object[], isFinal: opts.final ?? false } });
    this.realtime.publish({ type: 'leaderboard.updated', tournamentId, version });
    return { version, entries };
  }
}
