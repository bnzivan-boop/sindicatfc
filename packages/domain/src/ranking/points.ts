import type { BasePointsInput, PointsBreakdown, PointsInput, RankingRules } from './rules.js';

/**
 * base_points(place, field_size): очки за место из таблицы правил.
 * Место вне таблицы или вне размера поля даёт floorPoints.
 */
export function basePoints(rules: RankingRules, { place, fieldSize }: BasePointsInput): number {
  if (!Number.isInteger(place) || place < 1) throw new RangeError(`place должен быть ≥ 1, получено ${place}`);
  if (!Number.isInteger(fieldSize) || fieldSize < 1) {
    throw new RangeError(`fieldSize должен быть ≥ 1, получено ${fieldSize}`);
  }
  if (place > fieldSize) throw new RangeError(`place ${place} больше размера поля ${fieldSize}`);
  return rules.basePointsByPlace[place - 1] ?? rules.floorPoints;
}

/**
 * points = base_points(place, field_size) × event_coefficient × discipline_coefficient + bonuses − penalties
 * Результат округляется до двух знаков, чтобы ledger не накапливал плавающую погрешность.
 */
export function calculatePoints(rules: RankingRules, input: PointsInput): PointsBreakdown {
  const base = basePoints(rules, input);
  const levelCoefficient = rules.levelCoefficients[input.level];
  const disciplineCoefficient = rules.disciplineCoefficients[input.discipline] ?? 1;
  const bonuses = input.bonuses ?? 0;
  const penalties = input.penalties ?? 0;
  const raw = base * levelCoefficient * disciplineCoefficient + bonuses - penalties;
  return {
    base,
    levelCoefficient,
    disciplineCoefficient,
    bonuses,
    penalties,
    total: Math.max(0, Math.round(raw * 100) / 100),
    rulesVersion: rules.version,
  };
}

/**
 * Итог сезона по дисциплине: сумма N лучших результатов (или всех, если bestResultsCount = null).
 */
export function seasonTotal(rules: RankingRules, eventPoints: readonly number[]): number {
  const sorted = [...eventPoints].sort((a, b) => b - a);
  const counted = rules.bestResultsCount === null ? sorted : sorted.slice(0, rules.bestResultsCount);
  return Math.round(counted.reduce((sum, p) => sum + p, 0) * 100) / 100;
}
