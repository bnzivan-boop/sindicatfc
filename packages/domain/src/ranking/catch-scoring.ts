/**
 * Подсчёт зачёта по улову для форматов с суммой длин (Street, Shore Jig, Boat):
 * «сумма длины N лучших рыб, не более M рыб одного вида» (концепция, общая механика серии).
 */
export interface CountedCatch {
  resultId: string;
  speciesId: string;
  lengthMm: number;
}

export interface LengthSumRules {
  /** Сколько рыб идёт в зачёт (street — 5, shore jig — 3). */
  fishCount: number;
  /** Не более N рыб одного вида (street — 3); null — без ограничения. */
  maxPerSpecies: number | null;
  /** Минимальные размеры по видам (мм); рыба меньше не засчитывается. */
  minLengthMmBySpecies?: Record<string, number>;
}

export interface LengthSumScore {
  totalMm: number;
  counted: CountedCatch[];
  biggest: CountedCatch | null;
}

export function scoreLengthSum(catches: readonly CountedCatch[], rules: LengthSumRules): LengthSumScore {
  const eligible = catches.filter((c) => {
    const min = rules.minLengthMmBySpecies?.[c.speciesId];
    return min === undefined || c.lengthMm >= min;
  });
  const sorted = [...eligible].sort((a, b) => b.lengthMm - a.lengthMm);

  const perSpecies = new Map<string, number>();
  const counted: CountedCatch[] = [];
  for (const c of sorted) {
    if (counted.length >= rules.fishCount) break;
    const used = perSpecies.get(c.speciesId) ?? 0;
    if (rules.maxPerSpecies !== null && used >= rules.maxPerSpecies) continue;
    perSpecies.set(c.speciesId, used + 1);
    counted.push(c);
  }

  return {
    totalMm: counted.reduce((sum, c) => sum + c.lengthMm, 0),
    counted,
    biggest: sorted[0] ?? null,
  };
}
