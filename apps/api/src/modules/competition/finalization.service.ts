import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RankingsService } from '../rankings/rankings.service.js';
import { LeaderboardService } from './leaderboard.service.js';

/**
 * Финализация турнира (handoff §7.1, §10, §17):
 *  1. открытых протестов быть не должно;
 *  2. финальный снапшот лидерборда (isFinal) — протокол, который дальше не перезаписывается;
 *  3. очки сезона по местам — записями в ranking_ledger, проекция пересобирается;
 *  4. заявки → FINISHED, участники получают уведомление.
 */
@Injectable()
export class FinalizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
    private readonly rankings: RankingsService,
    private readonly notifications: NotificationsService,
  ) {}

  async finalize(tournamentId: string, actorId: string) {
    const open = await this.prisma.protest.count({ where: { tournamentId, status: { in: ['OPEN', 'UNDER_REVIEW'] } } });
    if (open > 0) throw new BadRequestException(`Нельзя финализировать: ${open} открытых протестов`);
    const pending = await this.prisma.result.count({ where: { tournamentId, status: { in: ['PENDING_JUDGE', 'SUBMITTED', 'AUTO_CHECKED', 'UNDER_PROTEST'] } } });
    if (pending > 0) throw new BadRequestException(`Нельзя финализировать: ${pending} результатов без решения судьи`);

    const t = await this.prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
    const { entries } = await this.leaderboard.recompute(tournamentId);

    // Очки — только участникам с зачётным результатом; остальные финишировавшие получают floorPoints позже, если так решит регламент сезона.
    await this.rankings.awardTournament(tournamentId, entries.map((e) => ({ userId: e.participantId, place: e.place })), actorId);
    // финальный протокол фиксируется только после успешного начисления
    await this.leaderboard.recompute(tournamentId, { final: true });

    await this.prisma.registration.updateMany({ where: { tournamentId, status: { in: ['CONFIRMED', 'CHECKED_IN'] } }, data: { status: 'FINISHED' } });

    const regs = await this.prisma.registrationMember.findMany({ where: { registration: { tournamentId, status: 'FINISHED' }, userId: { not: null } }, select: { userId: true } });
    for (const { userId } of regs) {
      const place = entries.find((e) => e.participantId === userId)?.place;
      await this.notifications.send(userId!, 'tournament.reminder', `${t.title}: итоги`, place ? `Ваше место — ${place}. Очки начислены в рейтинг сезона.` : 'Турнир финализирован, протокол опубликован.', { tournamentId });
    }
    return { places: entries.length, notified: regs.length };
  }
}
