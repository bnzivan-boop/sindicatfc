import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@sindikat/domain';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * RBAC с областью действия (handoff, раздел 5).
 * SYSTEM_ADMIN проходит везде; остальные роли — глобально либо в области,
 * совпадающей с параметром маршрута `:tournamentId` / `:clubId`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: AuthUser; params: Record<string, string> }>();
    const user = req.user;
    if (!user) throw new ForbiddenException();

    const scopeIds = new Set(Object.values(req.params));
    const ok = user.roles.some(
      (r) =>
        r.role === 'SYSTEM_ADMIN' ||
        (required.includes(r.role) && (r.scopeType === 'GLOBAL' || (r.scopeId !== null && scopeIds.has(r.scopeId)))),
    );
    if (!ok) throw new ForbiddenException('Недостаточно прав');
    return true;
  }
}
