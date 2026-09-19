import type { Discipline } from '../enums/discipline.js';
import type { TournamentLevel } from '../enums/tournament.js';

/**
 * Версионируемые правила рейтинга сезона (handoff, раздел 10).
 * Коэффициенты хранятся в данных (`ranking_rules`), а не в коде:
 * спорный Qualifier ×1 / ×1,25 решается настройкой, не релизом.
 */
export interface RankingRules {
  version: string;
  seasonId: string;
  /** Коэффициенты уровней событий, например { SPRINT: 1, QUALIFIER: 1, OPEN: 2, MAJOR: 3 }. */
  levelCoefficients: Record<TournamentLevel, number>;
  /** Коэффициент дисциплины; по умолчанию 1 для всех. */
  disciplineCoefficients: Partial<Record<Discipline, number>>;
  /** Сколько лучших результатов сезона идут в зачёт (null — все). */
  bestResultsCount: number | null;
  /** Минимум стартов в дисциплине для попадания в итоговый рейтинг / финал. */
  minStartsForFinal: number;
  /** Таблица базовых очков за место; недостающие места получают floorPoints. */
  basePointsByPlace: readonly number[];
  /** Очки за участие без места в таблице (например, финиш вне топа). */
  floorPoints: number;
  /** Правила ничьей в порядке применения. */
  tieBreakers: readonly TieBreaker[];
}

export type TieBreaker =
  | 'BIGGEST_FISH'
  | 'MORE_FISH'
  | 'EARLIER_LAST_FISH'
  | 'HEAD_TO_HEAD';

export interface BasePointsInput {
  place: number;
  fieldSize: number;
}

export interface PointsInput extends BasePointsInput {
  level: TournamentLevel;
  discipline: Discipline;
  bonuses?: number;
  penalties?: number;
}

export interface PointsBreakdown {
  base: number;
  levelCoefficient: number;
  disciplineCoefficient: number;
  bonuses: number;
  penalties: number;
  total: number;
  rulesVersion: string;
}
