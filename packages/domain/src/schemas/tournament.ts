import { z } from 'zod';
import { Discipline, ScoringMode } from '../enums/discipline.js';
import { ParticipationFormat, TournamentLevel, TournamentStatus } from '../enums/tournament.js';
import { idSchema, isoDateSchema, moneySchema } from './common.js';

export const tournamentListQuerySchema = z.object({
  seasonId: idSchema.optional(),
  discipline: z.nativeEnum(Discipline).optional(),
  level: z.nativeEnum(TournamentLevel).optional(),
  status: z.nativeEnum(TournamentStatus).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
export type TournamentListQuery = z.infer<typeof tournamentListQuerySchema>;

/** Карточка в календаре. */
export const tournamentSummarySchema = z.object({
  id: idSchema,
  slug: z.string(),
  title: z.string(),
  discipline: z.nativeEnum(Discipline),
  level: z.nativeEnum(TournamentLevel),
  status: z.nativeEnum(TournamentStatus),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  timezone: z.string(),
  locationTitle: z.string(),
  capacity: z.number().int(),
  registeredCount: z.number().int(),
  formats: z.array(z.nativeEnum(ParticipationFormat)),
  entryFee: moneySchema.nullable(),
});
export type TournamentSummary = z.infer<typeof tournamentSummarySchema>;

/** Полная карточка турнира (концепция + прототип event-view). */
export const tournamentDetailSchema = tournamentSummarySchema.extend({
  description: z.string().nullable(),
  scoringMode: z.nativeEnum(ScoringMode),
  registrationOpensAt: isoDateSchema.nullable(),
  registrationClosesAt: isoDateSchema.nullable(),
  reserveDate: isoDateSchema.nullable(),
  location: z.object({
    address: z.string(),
    meetingPoint: z.string().nullable(),
    parking: z.string().nullable(),
    /** Геометрия зоны отдаётся как GeoJSON; для boat — акватория, для street — маршрут. */
    zone: z.unknown().nullable(),
  }),
  schedule: z.array(z.object({ time: z.string(), title: z.string() })),
  rules: z.object({
    version: z.string(),
    allowedTackle: z.array(z.string()),
    forbiddenTackle: z.array(z.string()),
    scoringSummary: z.string(),
    fixationSummary: z.string(),
    penalties: z.array(z.string()),
    protestDeadlineMinutes: z.number().int(),
    documentUrl: z.string().url().nullable(),
  }),
});
export type TournamentDetail = z.infer<typeof tournamentDetailSchema>;

/* ── Кабинет организатора: создание и редактирование ── */

export const upsertTournamentSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().max(2000).nullable().optional(),
  discipline: z.nativeEnum(Discipline),
  level: z.nativeEnum(TournamentLevel),
  scoringMode: z.nativeEnum(ScoringMode),
  formats: z.array(z.nativeEnum(ParticipationFormat)).min(1),
  capacity: z.number().int().min(2).max(500),
  entryFeeMinor: z.number().int().min(0).nullable().optional(),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  reserveDate: isoDateSchema.nullable().optional(),
  registrationOpensAt: isoDateSchema.nullable().optional(),
  registrationClosesAt: isoDateSchema.nullable().optional(),
  protestDeadlineMinutes: z.number().int().min(0).max(240).default(30),
  location: z.object({
    title: z.string().min(2).max(80),
    address: z.string().min(3).max(200),
    meetingPoint: z.string().max(200).nullable().optional(),
    parking: z.string().max(200).nullable().optional(),
  }),
  schedule: z.array(z.object({ at: isoDateSchema, title: z.string().min(2).max(80) })).max(20).default([]),
});
export type UpsertTournament = z.infer<typeof upsertTournamentSchema>;

/** Новая версия регламента; публикуется отдельным действием. */
export const upsertRulesSchema = z.object({
  allowedTackle: z.array(z.string().min(2).max(200)).default([]),
  forbiddenTackle: z.array(z.string().min(2).max(200)).default([]),
  scoringSummary: z.string().min(5).max(500),
  fixationSummary: z.string().min(5).max(500),
  penalties: z.array(z.string().min(2).max(200)).default([]),
  scoringParams: z.object({ fishCount: z.number().int().min(1).max(20).optional(), maxPerSpecies: z.number().int().min(1).max(20).nullable().optional() }).default({}),
  publish: z.boolean().default(true),
});
export type UpsertRules = z.infer<typeof upsertRulesSchema>;
