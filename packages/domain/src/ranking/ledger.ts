import type { Discipline } from '../enums/discipline.js';

/**
 * Неизменяемая запись журнала начислений (`ranking_ledger`).
 * Текущая таблица рейтинга — вычисляемая проекция, которую можно
 * пересобрать из этого журнала целиком (handoff, 10 и 17).
 */
export const LedgerEventType = {
  TOURNAMENT_RESULT: 'TOURNAMENT_RESULT',
  PROTEST_CORRECTION: 'PROTEST_CORRECTION',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  BONUS: 'BONUS',
  PENALTY: 'PENALTY',
  /** Полное сторно предыдущей записи (ссылка в reversesLedgerId). */
  REVERSAL: 'REVERSAL',
} as const;
export type LedgerEventType = (typeof LedgerEventType)[keyof typeof LedgerEventType];

export interface LedgerEntry {
  id: string;
  userId: string;
  seasonId: string;
  discipline: Discipline;
  tournamentId: string | null;
  type: LedgerEventType;
  /** Дельта очков; может быть отрицательной. */
  delta: number;
  rulesVersion: string;
  reason: string | null;
  authorId: string | null;
  reversesLedgerId: string | null;
  createdAt: string; // ISO UTC
}

/** Пересобирает суммарные очки из журнала. Порядок записей не важен. */
export function projectTotals(entries: readonly LedgerEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.seasonId}:${e.discipline}:${e.userId}`;
    totals.set(key, Math.round(((totals.get(key) ?? 0) + e.delta) * 100) / 100);
  }
  return totals;
}
