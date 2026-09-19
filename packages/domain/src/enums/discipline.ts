/** Дисциплины лиги (концепция, раздел «Линейка форматов»). */
export const Discipline = {
  STREET: 'STREET', // Street & Shore Spin Series
  AREA_TROUT: 'AREA_TROUT', // Area Trout Battle
  FEEDER: 'FEEDER', // Feeder Sprint
  FLOAT: 'FLOAT', // Float Open / Sprint / Big Float Fish
  SHORE_JIG: 'SHORE_JIG', // Shore Jig Cup
  BOAT: 'BOAT', // Boat Predator Challenge
  ICE: 'ICE', // Ice Fishing Cup
} as const;
export type Discipline = (typeof Discipline)[keyof typeof Discipline];

export const DISCIPLINE_LABELS_RU: Record<Discipline, string> = {
  STREET: 'Стрит',
  AREA_TROUT: 'Форель',
  FEEDER: 'Фидер',
  FLOAT: 'Поплавок',
  SHORE_JIG: 'Джиг',
  BOAT: 'Лодка',
  ICE: 'Лёд',
};

/** Способ зачёта улова. */
export const ScoringMode = {
  /** Сумма длин N лучших рыб (street, jig, boat). */
  LENGTH_SUM: 'LENGTH_SUM',
  /** Общий вес улова (feeder, float open, ice). */
  TOTAL_WEIGHT: 'TOTAL_WEIGHT',
  /** Дуэли с очками за победу/ничью и плей-офф (area trout). */
  DUEL_POINTS: 'DUEL_POINTS',
  /** Сумма мест по турам (float sprint). */
  PLACE_SUM: 'PLACE_SUM',
  /** Одна самая крупная рыба (big fish). */
  BIGGEST_FISH: 'BIGGEST_FISH',
} as const;
export type ScoringMode = (typeof ScoringMode)[keyof typeof ScoringMode];
