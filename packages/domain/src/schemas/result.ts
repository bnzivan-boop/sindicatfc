import { z } from 'zod';
import { JudgeDecision, ProtestStatus, ResultStatus } from '../enums/result.js';
import { idSchema, isoDateSchema } from './common.js';

/** Создание черновика; клиент генерирует clientId для идемпотентности при плохой связи. */
export const createResultDraftSchema = z.object({
  clientId: z.string().uuid(),
  speciesId: idSchema,
  lengthMm: z.number().int().min(10).max(3000).optional(),
  weightG: z.number().int().min(1).max(100_000).optional(),
  markerCode: z.string().min(2).max(32),
  capturedAt: isoDateSchema,
});
export type CreateResultDraft = z.infer<typeof createResultDraftSchema>;

export const mediaUploadUrlSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/heic', 'image/png']),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type MediaUploadUrl = z.infer<typeof mediaUploadUrlSchema>;

export const judgeDecisionSchema = z.object({
  decision: z.nativeEnum(JudgeDecision),
  /** Судья может скорректировать длину/вес по фото. */
  lengthMm: z.number().int().optional(),
  weightG: z.number().int().optional(),
  reason: z.string().max(500).optional(),
});
export type JudgeDecisionInput = z.infer<typeof judgeDecisionSchema>;

export const createProtestSchema = z.object({
  targetType: z.enum(['RESULT', 'LEADERBOARD', 'DECISION']),
  targetId: idSchema,
  text: z.string().min(10).max(2000),
});
export type CreateProtest = z.infer<typeof createProtestSchema>;

export const resultSchema = z.object({
  id: idSchema,
  tournamentId: idSchema,
  participantId: idSchema,
  speciesId: idSchema,
  lengthMm: z.number().int().nullable(),
  weightG: z.number().int().nullable(),
  status: z.nativeEnum(ResultStatus),
  submittedAt: isoDateSchema.nullable(),
  photoUrl: z.string().url().nullable(),
});
export type Result = z.infer<typeof resultSchema>;

export const leaderboardEntrySchema = z.object({
  place: z.number().int(),
  participantId: idSchema,
  displayName: z.string(),
  startNumber: z.string().nullable(),
  score: z.number(),
  countedFish: z.number().int(),
  biggestFishMm: z.number().int().nullable(),
  updatedAt: isoDateSchema,
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const protestSchema = z.object({
  id: idSchema,
  status: z.nativeEnum(ProtestStatus),
  deadlineAt: isoDateSchema,
});
