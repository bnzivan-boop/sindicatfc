import { z } from 'zod';
import { Discipline } from '../enums/discipline.js';
import { WaterType } from '../enums/user.js';
import { idSchema } from './common.js';

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  cityId: idSchema.nullable().optional(),
  /** Город свободным текстом: сервер находит или создаёт запись в справочнике. */
  cityName: z.string().min(2).max(60).nullable().optional(),
  experienceYears: z.number().int().min(0).max(80).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  targetSpeciesIds: z.array(idSchema).max(20).optional(),
  waterTypes: z.array(z.nativeEnum(WaterType)).max(10).optional(),
  /** true — отметить онбординг завершённым (последний шаг мастера или «пропустить всё»). */
  onboardingCompleted: z.boolean().optional(),
});
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

export const setDisciplinesSchema = z.object({
  disciplines: z
    .array(z.object({ discipline: z.nativeEnum(Discipline), priority: z.number().int().min(1) }))
    .max(7),
});
export type SetDisciplines = z.infer<typeof setDisciplinesSchema>;

/** Публичный DTO — без телефона, точных координат и документов. */
export const publicProfileSchema = z.object({
  id: idSchema,
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  city: z.string().nullable(),
  experienceYears: z.number().int().nullable(),
  bio: z.string().nullable(),
  waterTypes: z.array(z.nativeEnum(WaterType)),
  memberSince: z.coerce.date(),
  disciplines: z.array(z.nativeEnum(Discipline)),
  season: z.array(z.object({ discipline: z.nativeEnum(Discipline), rank: z.number().int(), points: z.number(), starts: z.number().int() })),
  history: z.array(z.object({ tournamentId: idSchema, title: z.string(), startsAt: z.coerce.date(), discipline: z.nativeEnum(Discipline), level: z.string(), place: z.number().int().nullable(), fieldSize: z.number().int() })),
  podiums: z.number().int(),
  wins: z.number().int(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;
