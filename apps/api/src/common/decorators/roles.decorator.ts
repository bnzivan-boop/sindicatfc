import { SetMetadata } from '@nestjs/common';
import type { Role } from '@sindikat/domain';

export const ROLES_KEY = 'roles';
/** Требуемые роли. Область (турнир/клуб) проверяет RolesGuard по параметру маршрута. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
