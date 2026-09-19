import { describe, expect, it } from 'vitest';
import { scoreLengthSum } from './catch-scoring.js';
import { projectTotals, type LedgerEntry } from './ledger.js';
import { basePoints, calculatePoints, seasonTotal } from './points.js';
import type { RankingRules } from './rules.js';

const rules: RankingRules = {
  version: '2027.1',
  seasonId: 'season-2027',
  levelCoefficients: { SPRINT: 1, QUALIFIER: 1.25, OPEN: 2, MAJOR: 3, GRAND_FINAL: 3 },
  disciplineCoefficients: {},
  bestResultsCount: 4,
  minStartsForFinal: 2,
  basePointsByPlace: [100, 80, 65, 55, 50],
  floorPoints: 10,
  tieBreakers: ['BIGGEST_FISH', 'MORE_FISH'],
};

describe('basePoints', () => {
  it('берёт очки из таблицы и floor за её пределами', () => {
    expect(basePoints(rules, { place: 1, fieldSize: 40 })).toBe(100);
    expect(basePoints(rules, { place: 5, fieldSize: 40 })).toBe(50);
    expect(basePoints(rules, { place: 6, fieldSize: 40 })).toBe(10);
  });

  it('отвергает место больше размера поля', () => {
    expect(() => basePoints(rules, { place: 41, fieldSize: 40 })).toThrow(RangeError);
  });
});

describe('calculatePoints', () => {
  it('умножает на коэффициент уровня из правил, а не из кода', () => {
    const open = calculatePoints(rules, { place: 1, fieldSize: 40, level: 'OPEN', discipline: 'STREET' });
    expect(open.total).toBe(200);
    const qualifier = calculatePoints(rules, {
      place: 2,
      fieldSize: 40,
      level: 'QUALIFIER',
      discipline: 'STREET',
    });
    expect(qualifier.total).toBe(100);
    expect(qualifier.rulesVersion).toBe('2027.1');
  });

  it('учитывает бонусы и штрафы и не уходит в минус', () => {
    const r = calculatePoints(rules, {
      place: 6,
      fieldSize: 40,
      level: 'SPRINT',
      discipline: 'FEEDER',
      penalties: 50,
    });
    expect(r.total).toBe(0);
  });
});

describe('seasonTotal', () => {
  it('суммирует только N лучших результатов', () => {
    expect(seasonTotal(rules, [100, 10, 50, 80, 65])).toBe(295);
  });
});

describe('projectTotals', () => {
  it('пересобирает рейтинг из журнала, включая сторно', () => {
    const base: Omit<LedgerEntry, 'id' | 'delta' | 'type'> = {
      userId: 'u1',
      seasonId: 's',
      discipline: 'STREET',
      tournamentId: 't1',
      rulesVersion: '2027.1',
      reason: null,
      authorId: null,
      reversesLedgerId: null,
      createdAt: '2027-07-17T12:00:00Z',
    };
    const entries: LedgerEntry[] = [
      { ...base, id: '1', type: 'TOURNAMENT_RESULT', delta: 200 },
      { ...base, id: '2', type: 'REVERSAL', delta: -200, reversesLedgerId: '1' },
      { ...base, id: '3', type: 'PROTEST_CORRECTION', delta: 160 },
    ];
    expect(projectTotals(entries).get('s:STREET:u1')).toBe(160);
  });
});

describe('scoreLengthSum', () => {
  it('street: 5 лучших рыб, не более 3 одного вида', () => {
    const catches = [
      { resultId: 'a', speciesId: 'perch', lengthMm: 310 },
      { resultId: 'b', speciesId: 'perch', lengthMm: 300 },
      { resultId: 'c', speciesId: 'perch', lengthMm: 290 },
      { resultId: 'd', speciesId: 'perch', lengthMm: 280 },
      { resultId: 'e', speciesId: 'pike', lengthMm: 420 },
      { resultId: 'f', speciesId: 'zander', lengthMm: 200 },
    ];
    const score = scoreLengthSum(catches, { fishCount: 5, maxPerSpecies: 3 });
    expect(score.counted.map((c) => c.resultId)).toEqual(['e', 'a', 'b', 'c', 'f']);
    expect(score.totalMm).toBe(420 + 310 + 300 + 290 + 200);
    expect(score.biggest?.resultId).toBe('e');
  });

  it('shore jig: минимальный размер по виду отсекает незачётную рыбу', () => {
    const score = scoreLengthSum(
      [
        { resultId: 'a', speciesId: 'zander', lengthMm: 380 },
        { resultId: 'b', speciesId: 'zander', lengthMm: 450 },
      ],
      { fishCount: 3, maxPerSpecies: null, minLengthMmBySpecies: { zander: 400 } },
    );
    expect(score.counted).toHaveLength(1);
    expect(score.totalMm).toBe(450);
  });
});
