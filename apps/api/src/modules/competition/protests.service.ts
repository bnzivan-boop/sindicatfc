import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateProtest } from '@sindikat/domain';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { LeaderboardService } from './leaderboard.service.js';
import { RealtimeService } from '../../infra/realtime/realtime.service.js';

@Injectable()
export class ProtestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async create(authorId: string, tournamentId: string, dto: CreateProtest) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId }, select: { status: true, endsAt: true, protestDeadlineMinutes: true } });
    if (!t) throw new NotFoundException();
    if (!['LIVE', 'JUDGING'].includes(t.status)) throw new BadRequestException('Протесты не принимаются');
    const deadlineAt = new Date(t.endsAt.getTime() + t.protestDeadlineMinutes * 60_000);
    if (new Date() > deadlineAt) throw new BadRequestException('Срок подачи протеста истёк');

    const protest = await this.prisma.protest.create({ data: { tournamentId, authorId, ...dto, deadlineAt } });
    if (dto.targetType === 'RESULT') {
      await this.prisma.result.updateMany({ where: { id: dto.targetId, status: { in: ['ACCEPTED', 'REJECTED', 'CORRECTED'] } }, data: { status: 'UNDER_PROTEST' } });
    }
    this.realtime.publish({ type: 'protest.updated', tournamentId, protestId: protest.id, status: protest.status });
    return protest;
  }

  listMine(authorId: string, tournamentId: string) {
    return this.prisma.protest.findMany({ where: { tournamentId, authorId }, orderBy: { createdAt: 'desc' } });
  }

  list(tournamentId: string) {
    return this.prisma.protest.findMany({ where: { tournamentId }, include: { author: { include: { profile: { select: { displayName: true } } } } }, orderBy: { createdAt: 'asc' } });
  }

  /**
   * Решение главного судьи. Протест на результат:
   *  UPHELD  → результат корректируется (ResultCorrection с before/after) и получает статус CORRECTED;
   *  DISMISSED → результат возвращается в статус до протеста (ACCEPTED/REJECTED по последнему решению судьи).
   * Ничего не перезаписывается «в лоб» — есть корректирующая запись с автором и причиной (handoff §7.1).
   */
  async resolve(headJudgeId: string, tournamentId: string, protestId: string, dto: { status: 'UPHELD' | 'DISMISSED'; resolution: string; lengthMm?: number; weightG?: number }) {
    const protest = await this.prisma.protest.findUnique({ where: { id: protestId } });
    if (!protest || protest.tournamentId !== tournamentId) throw new NotFoundException();
    if (!['OPEN', 'UNDER_REVIEW'].includes(protest.status)) throw new BadRequestException('Протест уже закрыт');

    await this.prisma.$transaction(async (tx) => {
      await tx.protest.update({ where: { id: protestId }, data: { status: dto.status, resolution: dto.resolution, resolvedBy: headJudgeId, resolvedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: headJudgeId, action: `protest.${dto.status.toLowerCase()}`, entityType: 'protest', entityId: protestId, after: dto } });

      if (protest.targetType === 'RESULT') {
        const result = await tx.result.findUnique({ where: { id: protest.targetId }, include: { decisions: { orderBy: { createdAt: 'desc' }, take: 1 } } });
        if (result) {
          if (dto.status === 'UPHELD') {
            const after = { status: 'CORRECTED', lengthMm: dto.lengthMm ?? result.lengthMm, weightG: dto.weightG ?? result.weightG };
            await tx.resultCorrection.create({ data: { resultId: result.id, authorId: headJudgeId, before: { status: result.status, lengthMm: result.lengthMm, weightG: result.weightG }, after, reason: dto.resolution } });
            await tx.result.update({ where: { id: result.id }, data: { status: 'CORRECTED', lengthMm: after.lengthMm, weightG: after.weightG } });
          } else {
            const last = result.decisions[0]?.decision;
            await tx.result.update({ where: { id: result.id }, data: { status: last === 'ACCEPT' ? 'ACCEPTED' : last === 'REJECT' ? 'REJECTED' : 'PENDING_JUDGE' } });
          }
        }
      }
    });

    await this.leaderboard.recompute(tournamentId);
    await this.notifications.send(protest.authorId, 'protest.resolved', dto.status === 'UPHELD' ? 'Протест удовлетворён' : 'Протест отклонён', dto.resolution, { tournamentId, protestId });
    this.realtime.publish({ type: 'protest.updated', tournamentId, protestId, status: dto.status });
    return this.prisma.protest.findUniqueOrThrow({ where: { id: protestId } });
  }
}
