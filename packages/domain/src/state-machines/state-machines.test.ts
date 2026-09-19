import { describe, expect, it } from 'vitest';
import { InvalidTransitionError } from './machine.js';
import { registrationMachine } from './registration.js';
import { resultMachine } from './result.js';
import { tournamentMachine } from './tournament.js';

describe('tournamentMachine', () => {
  it('проходит счастливый путь до архива', () => {
    const path = [
      'DRAFT',
      'INTERNAL_REVIEW',
      'PUBLISHED',
      'REGISTRATION_OPEN',
      'REGISTRATION_CLOSED',
      'LIVE',
      'JUDGING',
      'FINALIZED',
      'ARCHIVED',
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(tournamentMachine.canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
    expect(tournamentMachine.isTerminal('ARCHIVED')).toBe(true);
  });

  it('не даёт вернуть финализированный турнир в live', () => {
    expect(() => tournamentMachine.assertTransition('FINALIZED', 'LIVE')).toThrow(
      InvalidTransitionError,
    );
  });
});

describe('registrationMachine', () => {
  it('парная заявка ждёт напарника, потом оплату', () => {
    expect(registrationMachine.canTransition('DRAFT', 'WAITING_MEMBERS')).toBe(true);
    expect(registrationMachine.canTransition('WAITING_MEMBERS', 'WAITING_PAYMENT')).toBe(true);
    expect(registrationMachine.canTransition('WAITING_PAYMENT', 'CONFIRMED')).toBe(true);
  });

  it('возврат возможен только через REFUND_PENDING', () => {
    expect(registrationMachine.canTransition('CONFIRMED', 'REFUNDED')).toBe(false);
    expect(registrationMachine.canTransition('CONFIRMED', 'REFUND_PENDING')).toBe(true);
    expect(registrationMachine.canTransition('REFUND_PENDING', 'REFUNDED')).toBe(true);
  });
});

describe('resultMachine', () => {
  it('судья не может принять незагруженный результат', () => {
    expect(resultMachine.canTransition('UPLOADING', 'ACCEPTED')).toBe(false);
    expect(resultMachine.canTransition('DRAFT', 'PENDING_JUDGE')).toBe(false);
  });

  it('повторная фотография возвращает результат в загрузку', () => {
    expect(resultMachine.canTransition('PENDING_JUDGE', 'NEEDS_RESUBMISSION')).toBe(true);
    expect(resultMachine.canTransition('NEEDS_RESUBMISSION', 'UPLOADING')).toBe(true);
  });
});
