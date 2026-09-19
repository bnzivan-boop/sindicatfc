import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@sindikat/domain';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import { RolesGuard } from './roles.guard.js';

function ctx(user: AuthUser | undefined, params: Record<string, string> = {}): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as unknown as ExecutionContext;
}

const guard = (required: Role[] | undefined) =>
  new RolesGuard({ getAllAndOverride: () => required } as unknown as Reflector);

const judgeOfT1: AuthUser = { id: 'u', phone: '+7', roles: [{ role: 'JUDGE', scopeType: 'TOURNAMENT', scopeId: 't1' }] };

describe('RolesGuard', () => {
  it('пропускает маршруты без @Roles', () => {
    expect(guard(undefined).canActivate(ctx(undefined))).toBe(true);
  });

  it('судья турнира t1 проходит только в t1', () => {
    expect(guard(['JUDGE']).canActivate(ctx(judgeOfT1, { tournamentId: 't1' }))).toBe(true);
    expect(() => guard(['JUDGE']).canActivate(ctx(judgeOfT1, { tournamentId: 't2' }))).toThrow(ForbiddenException);
  });

  it('глобальная роль проходит в любую область', () => {
    const globalJudge: AuthUser = { ...judgeOfT1, roles: [{ role: 'JUDGE', scopeType: 'GLOBAL', scopeId: null }] };
    expect(guard(['JUDGE']).canActivate(ctx(globalJudge, { tournamentId: 't9' }))).toBe(true);
  });

  it('SYSTEM_ADMIN проходит везде', () => {
    const admin: AuthUser = { ...judgeOfT1, roles: [{ role: 'SYSTEM_ADMIN', scopeType: 'GLOBAL', scopeId: null }] };
    expect(guard(['HEAD_JUDGE']).canActivate(ctx(admin))).toBe(true);
  });

  it('без пользователя — 403', () => {
    expect(() => guard(['ORGANIZER']).canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
