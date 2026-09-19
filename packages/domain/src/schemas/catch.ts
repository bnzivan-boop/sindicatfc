import { z } from 'zod';
import { LocationPrivacy, Visibility } from '../enums/user.js';
import { idSchema, isoDateSchema } from './common.js';

/** Единая сущность `catch`: запись дневника, которую можно повысить до трофея (handoff 6.3). */
export const createCatchSchema = z.object({
  speciesId: idSchema,
  lengthMm: z.number().int().min(10).max(3000).optional(),
  weightG: z.number().int().min(1).max(200_000).optional(),
  description: z.string().max(2000).optional(),
  caughtAt: isoDateSchema,
  gear: z
    .object({ gearKitId: idSchema.optional(), lureId: idSchema.optional(), freeText: z.string().max(200).optional() })
    .optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      waterbodyId: idSchema.optional(),
      privacy: z.nativeEnum(LocationPrivacy).default('HIDDEN'),
    })
    .optional(),
  tournamentId: idSchema.optional(),
  visibility: z.nativeEnum(Visibility).default('PUBLIC'),
});
export type CreateCatch = z.infer<typeof createCatchSchema>;

export const trophyListQuerySchema = z.object({
  sort: z.enum(['date', 'species', 'weight', 'length']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type TrophyListQuery = z.infer<typeof trophyListQuerySchema>;

/** Публичная карточка трофея. Точных координат здесь нет по построению. */
export const trophyCardSchema = z.object({
  id: idSchema,
  species: z.string(),
  lengthMm: z.number().int().nullable(),
  weightG: z.number().int().nullable(),
  description: z.string().nullable(),
  caughtAt: isoDateSchema,
  photos: z.array(z.string().url()),
  gearSummary: z.string().nullable(),
  waterbody: z.string().nullable(),
  isPersonalRecord: z.boolean(),
  tournamentTitle: z.string().nullable(),
  likes: z.number().int(),
  comments: z.number().int(),
});
export type TrophyCard = z.infer<typeof trophyCardSchema>;
