import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { resultMachine, type CreateResultDraft, type JudgeDecisionInput, type MediaUploadUrl, type ResultStatus } from '@sindikat/domain';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { RealtimeService } from '../../infra/realtime/realtime.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { LeaderboardService } from './leaderboard.service.js';

/**
 * Отправка результата (handoff 7.3, 7.4, 13):
 * черновик → URL загрузки → submit → очередь судьи → решение → live-обновление.
 * Дубли отсекаются по (tournamentId, participantId, clientId) и checksum файла.
 */
@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly realtime: RealtimeService,
    private readonly leaderboard: LeaderboardService,
    private readonly notifications: NotificationsService,
  ) {}

  async createDraft(participantId: string, tournamentId: string, dto: CreateResultDraft) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId }, select: { status: true, endsAt: true } });
    if (!tournament) throw new NotFoundException();
    if (tournament.status !== 'LIVE') throw new BadRequestException('Турнир не в статусе LIVE');
    await this.assertParticipant(participantId, tournamentId);

    const marker = await this.prisma.competitionMarker.findFirst({
      where: { tournamentId, code: dto.markerCode, validFrom: { lte: new Date() }, validTo: { gte: new Date() } },
    });
    if (!marker) throw new BadRequestException('Маркер турнира недействителен');

    return this.prisma.result.upsert({
      where: { tournamentId_participantId_clientId: { tournamentId, participantId, clientId: dto.clientId } },
      create: { tournamentId, participantId, clientId: dto.clientId, speciesId: dto.speciesId, lengthMm: dto.lengthMm, weightG: dto.weightG, markerCode: dto.markerCode, capturedAt: dto.capturedAt },
      update: {},
    });
  }

  async createMediaUploadUrl(participantId: string, resultId: string, dto: MediaUploadUrl) {
    const result = await this.assertOwner(participantId, resultId);
    if (!['DRAFT', 'UPLOADING', 'NEEDS_RESUBMISSION'].includes(result.status)) throw new BadRequestException('Результат уже отправлен');

    // идемпотентность по checksum: повторная загрузка того же файла вернёт тот же fileId
    const dup = await this.prisma.resultMedia.findFirst({ where: { resultId, checksum: dto.checksumSha256 }, include: { file: true } });
    if (dup) return { fileId: dup.fileId, uploadUrl: null, objectKey: dup.file.objectKey, expiresInSec: 0 };

    const fileId = randomUUID();
    const target = await this.storage.createUploadUrl({ fileId, bucket: 'private', mimeType: dto.mimeType, sizeBytes: dto.sizeBytes });
    await this.prisma.$transaction([
      this.prisma.file.create({
        data: { id: fileId, ownerId: participantId, bucket: 'private', objectKey: target.objectKey, mimeType: dto.mimeType, sizeBytes: dto.sizeBytes, checksum: dto.checksumSha256, isPrivate: true },
      }),
      this.prisma.resultMedia.create({ data: { resultId, fileId, checksum: dto.checksumSha256 } }),
      this.prisma.result.update({ where: { id: resultId }, data: { status: 'UPLOADING' } }),
    ]);
    return target;
  }

  async submit(participantId: string, resultId: string) {
    const result = await this.assertOwner(participantId, resultId);
    const media = await this.prisma.resultMedia.findMany({ where: { resultId }, include: { file: true } });
    if (media.length === 0) throw new BadRequestException('Нет фотографии');
    // Подтверждаем, что файлы реально лежат в хранилище (handoff §9, шаг 3)
    for (const m of media) {
      if (m.file.status === 'UPLOADED') continue;
      const check = await this.storage.verifyUploaded(m.file.objectKey, 'private', m.file.sizeBytes);
      if (!check.ok) throw new BadRequestException('Фотография ещё не загружена');
      await this.prisma.file.update({ where: { id: m.fileId }, data: { status: 'UPLOADED' } });
    }
    await this.transition(result.id, result.status, 'SUBMITTED', { submittedAt: new Date() });
    // Автопроверка (EXIF, время, размер) — фоновая задача; пока сразу в очередь судьи.
    const updated = await this.transition(result.id, 'SUBMITTED', 'PENDING_JUDGE');
    await this.notifyQueue(result.tournamentId);
    return updated;
  }

  async listMine(participantId: string, tournamentId: string) {
    const rows = await this.prisma.result.findMany({
      where: { tournamentId, participantId },
      include: { species: true, decisions: { orderBy: { createdAt: 'desc' }, take: 1 }, media: { include: { file: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.withPhoto(r)));
  }

  async judgeQueue(tournamentId: string) {
    const rows = await this.prisma.result.findMany({
      where: { tournamentId, status: 'PENDING_JUDGE' },
      include: { species: true, participant: { include: { profile: { select: { displayName: true } } } }, media: { include: { file: true } } },
      orderBy: { submittedAt: 'asc' },
    });
    return Promise.all(rows.map((r) => this.withPhoto(r)));
  }

  /** Подписанная ссылка на фото — только для участника и судей, TTL короткий. */
  private async withPhoto<T extends { media: Array<{ file: { objectKey: string } }> }>(r: T) {
    const first = r.media[0];
    return { ...r, photoUrl: first ? await this.storage.createReadUrl(first.file.objectKey, 'private') : null };
  }

  async decide(judgeId: string, tournamentId: string, resultId: string, dto: JudgeDecisionInput) {
    const result = await this.prisma.result.findUnique({ where: { id: resultId } });
    if (!result || result.tournamentId !== tournamentId) throw new NotFoundException();

    const next: ResultStatus = { ACCEPT: 'ACCEPTED', REJECT: 'REJECTED', REQUEST_RESUBMISSION: 'NEEDS_RESUBMISSION' }[dto.decision] as ResultStatus;
    resultMachine.assertTransition(result.status, next);

    const [updated] = await this.prisma.$transaction([
      this.prisma.result.update({
        where: { id: resultId },
        data: { status: next, lengthMm: dto.lengthMm ?? result.lengthMm, weightG: dto.weightG ?? result.weightG },
      }),
      this.prisma.judgeDecision.create({ data: { resultId, judgeId, decision: dto.decision, lengthMm: dto.lengthMm, weightG: dto.weightG, reason: dto.reason } }),
      this.prisma.auditLog.create({ data: { actorId: judgeId, action: `result.${dto.decision.toLowerCase()}`, entityType: 'result', entityId: resultId, before: { status: result.status }, after: { status: next } } }),
    ]);

    this.realtime.publish({ type: 'result.status', tournamentId, resultId, participantId: result.participantId, status: next });
    const species = await this.prisma.fishSpecies.findUnique({ where: { id: result.speciesId }, select: { nameRu: true } });
    const label = `${species?.nameRu ?? 'Рыба'}${(dto.lengthMm ?? result.lengthMm) ? ` ${(dto.lengthMm ?? result.lengthMm)! / 10} см` : ''}`;
    const text = { ACCEPT: ['result.accepted', `${label} засчитан`, 'Судья подтвердил результат.'], REJECT: ['result.rejected', `${label} отклонён`, dto.reason ?? 'Результат не принят судьёй.'], REQUEST_RESUBMISSION: ['result.resubmission', `${label}: нужно новое фото`, dto.reason ?? 'Переснимите на линейке с маркером в кадре.'] }[dto.decision] as [string, string, string];
    await this.notifications.send(result.participantId, text[0] as never, text[1], text[2], { tournamentId, resultId });
    if (next === 'ACCEPTED') await this.leaderboard.recompute(tournamentId);
    await this.notifyQueue(tournamentId);
    return updated;
  }

  private async transition(id: string, from: ResultStatus, to: ResultStatus, extra: Record<string, unknown> = {}) {
    resultMachine.assertTransition(from, to);
    return this.prisma.result.update({ where: { id }, data: { status: to, ...extra } });
  }

  private async notifyQueue(tournamentId: string) {
    const pending = await this.prisma.result.count({ where: { tournamentId, status: 'PENDING_JUDGE' } });
    this.realtime.publish({ type: 'judge.queue', tournamentId, pending });
  }

  private async assertParticipant(userId: string, tournamentId: string) {
    const member = await this.prisma.registrationMember.findFirst({
      where: { userId, invitationStatus: 'ACCEPTED', registration: { tournamentId, status: { in: ['CONFIRMED', 'CHECKED_IN'] } } },
    });
    if (!member) throw new ForbiddenException('Вы не участник этого турнира');
  }

  private async assertOwner(userId: string, resultId: string) {
    const r = await this.prisma.result.findUnique({ where: { id: resultId } });
    if (!r) throw new NotFoundException();
    if (r.participantId !== userId) throw new ForbiddenException();
    return r;
  }
}
