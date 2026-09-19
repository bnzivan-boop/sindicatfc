/** Роли (handoff, раздел 5). Права проверяются только на backend. */
export const Role = {
  USER: 'USER',
  PARTICIPANT: 'PARTICIPANT',
  CLUB_CAPTAIN: 'CLUB_CAPTAIN',
  CHANNEL_OWNER: 'CHANNEL_OWNER',
  MODERATOR: 'MODERATOR',
  JUDGE: 'JUDGE',
  HEAD_JUDGE: 'HEAD_JUDGE',
  ORGANIZER: 'ORGANIZER',
  SUPPORT: 'SUPPORT',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Область действия роли: глобально, на турнир, на клуб или канал. */
export const RoleScopeType = {
  GLOBAL: 'GLOBAL',
  TOURNAMENT: 'TOURNAMENT',
  CLUB: 'CLUB',
  CHANNEL: 'CHANNEL',
} as const;
export type RoleScopeType = (typeof RoleScopeType)[keyof typeof RoleScopeType];

export const Visibility = {
  PUBLIC: 'PUBLIC',
  FRIENDS: 'FRIENDS',
  PRIVATE: 'PRIVATE',
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

/** Приватность геолокации трофея. Точная координата не попадает в публичный API при WATERBODY_ONLY / HIDDEN. */
export const LocationPrivacy = {
  EXACT: 'EXACT',
  WATERBODY_ONLY: 'WATERBODY_ONLY',
  HIDDEN: 'HIDDEN',
} as const;
export type LocationPrivacy = (typeof LocationPrivacy)[keyof typeof LocationPrivacy];

export const ConsentType = {
  TERMS: 'TERMS',
  PRIVACY: 'PRIVACY',
  MARKETING: 'MARKETING',
  GEO_PUBLISH: 'GEO_PUBLISH',
} as const;
export type ConsentType = (typeof ConsentType)[keyof typeof ConsentType];

/** Типы акваторий для онбординга («домашние водоёмы или типы акваторий», концепция). */
export const WaterType = {
  RIVER: 'RIVER',
  RESERVOIR: 'RESERVOIR',
  LAKE: 'LAKE',
  POND: 'POND',
  PAID: 'PAID',
  QUARRY: 'QUARRY',
  ICE: 'ICE',
  SEA: 'SEA',
} as const;
export type WaterType = (typeof WaterType)[keyof typeof WaterType];

export const WATER_TYPE_LABELS_RU: Record<WaterType, string> = {
  RIVER: 'река',
  RESERVOIR: 'водохранилище',
  LAKE: 'озеро',
  POND: 'городской пруд',
  PAID: 'платный водоём',
  QUARRY: 'карьер',
  ICE: 'лёд',
  SEA: 'море',
};
