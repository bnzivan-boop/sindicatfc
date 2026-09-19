/**
 * Минимальная декларативная статусная машина.
 * Переходы описываются таблицей; проверка выполняется на backend
 * перед любым изменением статуса, а клиенты используют её только
 * для подсказок в интерфейсе.
 */
export type TransitionTable<S extends string> = Readonly<Record<S, readonly S[]>>;

export class InvalidTransitionError<S extends string> extends Error {
  constructor(
    public readonly entity: string,
    public readonly from: S,
    public readonly to: S,
  ) {
    super(`${entity}: переход ${from} → ${to} недопустим`);
    this.name = 'InvalidTransitionError';
  }
}

export interface StateMachine<S extends string> {
  readonly entity: string;
  readonly initial: S;
  canTransition(from: S, to: S): boolean;
  nextStates(from: S): readonly S[];
  /** Бросает InvalidTransitionError, если переход не разрешён. */
  assertTransition(from: S, to: S): void;
  isTerminal(state: S): boolean;
}

export function defineStateMachine<S extends string>(
  entity: string,
  initial: S,
  table: TransitionTable<S>,
): StateMachine<S> {
  return {
    entity,
    initial,
    canTransition: (from, to) => table[from].includes(to),
    nextStates: (from) => table[from],
    assertTransition(from, to) {
      if (!table[from].includes(to)) throw new InvalidTransitionError(entity, from, to);
    },
    isTerminal: (state) => table[state].length === 0,
  };
}
