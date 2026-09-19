import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@sindikat/domain';

export interface AuthUser {
  id: string;
  phone: string;
  /** Роли с областью: `ORGANIZER:TOURNAMENT:<id>` или `SYSTEM_ADMIN:GLOBAL`. */
  roles: Array<{ role: Role; scopeType: string; scopeId: string | null }>;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
});
