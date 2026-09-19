/**
 * Уровень события. Коэффициент НЕ хранится здесь: он задаётся в
 * настройках типа турнира / правилах сезона (handoff, разделы 2.2 и 10).
 */
export const TournamentLevel = {
  SPRINT: 'SPRINT',
  QUALIFIER: 'QUALIFIER',
  OPEN: 'OPEN',
  MAJOR: 'MAJOR',
  GRAND_FINAL: 'GRAND_FINAL',
} as const;
export type TournamentLevel = (typeof TournamentLevel)[keyof typeof TournamentLevel];

/** Жизненный цикл турнира (handoff, 7.1). */
export const TournamentStatus = {
  DRAFT: 'DRAFT',
  INTERNAL_REVIEW: 'INTERNAL_REVIEW',
  PUBLISHED: 'PUBLISHED',
  REGISTRATION_OPEN: 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
  LIVE: 'LIVE',
  JUDGING: 'JUDGING',
  FINALIZED: 'FINALIZED',
  ARCHIVED: 'ARCHIVED',
  POSTPONED: 'POSTPONED',
  CANCELLED: 'CANCELLED',
} as const;
export type TournamentStatus = (typeof TournamentStatus)[keyof typeof TournamentStatus];

/** Формат участия. TEAM — под вопросом (handoff, расхождение №3). */
export const ParticipationFormat = {
  SOLO: 'SOLO',
  PAIR: 'PAIR',
  TEAM: 'TEAM',
  CREW: 'CREW', // экипаж лодки
} as const;
export type ParticipationFormat = (typeof ParticipationFormat)[keyof typeof ParticipationFormat];
