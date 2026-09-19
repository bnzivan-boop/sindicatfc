import { z } from 'zod';
import { Discipline } from '../enums/discipline.js';
import { BoatType, GearCatalogType, LineType, ReelType, RodType } from '../enums/gear.js';
import { Visibility } from '../enums/user.js';
import { idSchema } from './common.js';

export const gearCatalogQuerySchema = z.object({
  type: z.nativeEnum(GearCatalogType),
  query: z.string().max(80).optional(),
  brandId: idSchema.optional(),
});

/** Ссылка на каталог или свободная модель — каталог не должен блокировать пользователя. */
const catalogRef = z.object({
  brandId: idSchema.optional(),
  modelId: idSchema.optional(),
  customBrand: z.string().max(80).optional(),
  customModel: z.string().max(120).optional(),
});

export const rodSchema = catalogRef.extend({
  type: z.nativeEnum(RodType),
  lengthMm: z.number().int().positive().optional(),
  lureTestMinG: z.number().nonnegative().optional(),
  lureTestMaxG: z.number().positive().optional(),
  action: z.string().max(40).optional(),
  power: z.string().max(40).optional(),
  sections: z.number().int().min(1).max(10).optional(),
});

export const reelSchema = catalogRef.extend({
  type: z.nativeEnum(ReelType),
  size: z.string().max(20).optional(),
  gearRatio: z.string().max(20).optional(),
  weightG: z.number().int().positive().optional(),
  spareSpool: z.boolean().optional(),
});

export const lineSchema = catalogRef.extend({
  type: z.nativeEnum(LineType),
  diameterMm: z.number().positive().optional(),
  peSize: z.string().max(10).optional(),
  breakingLoadLb: z.number().positive().optional(),
  color: z.string().max(40).optional(),
  installedAt: z.string().date().optional(),
  condition: z.string().max(40).optional(),
});

export const leaderSchema = catalogRef.extend({
  material: z.nativeEnum(LineType),
  diameterMm: z.number().positive().optional(),
  lengthCm: z.number().positive().optional(),
  breakingLoadLb: z.number().positive().optional(),
});

export const lureSchema = catalogRef.extend({
  type: z.string().max(60),
  weightG: z.number().positive().optional(),
  color: z.string().max(40).optional(),
  comment: z.string().max(200).optional(),
});

/** Комплект: удилище → катушка → основная леска → поводок → приманки. */
export const upsertGearKitSchema = z.object({
  name: z.string().min(2).max(60),
  discipline: z.nativeEnum(Discipline),
  targetSpeciesIds: z.array(idSchema).max(10).default([]),
  purpose: z.string().max(200).optional(),
  isPrimary: z.boolean().default(false),
  visibility: z.nativeEnum(Visibility).default('PUBLIC'),
  photoFileId: idSchema.optional(),
  comment: z.string().max(500).optional(),
  rod: rodSchema.optional(),
  reel: reelSchema.optional(),
  mainLine: lineSchema.optional(),
  leader: leaderSchema.optional(),
  lures: z.array(lureSchema).max(20).default([]),
});
export type UpsertGearKit = z.infer<typeof upsertGearKitSchema>;

export const upsertBoatSchema = catalogRef.extend({
  type: z.nativeEnum(BoatType),
  lengthCm: z.number().int().positive().optional(),
  material: z.string().max(40).optional(),
  seats: z.number().int().min(1).max(20).optional(),
  capacityKg: z.number().int().positive().optional(),
  motor: catalogRef.extend({ type: z.string().max(40).optional(), powerHp: z.number().positive().optional() }).optional(),
  electricMotor: z.string().max(120).optional(),
  sonar: z.string().max(120).optional(),
  trailer: z.boolean().optional(),
  availableForTeamTrips: z.boolean().default(false),
  visibility: z.nativeEnum(Visibility).default('PUBLIC'),
});
export type UpsertBoat = z.infer<typeof upsertBoatSchema>;
