import { cookies } from 'next/headers';
import { apiServer } from './api';

export interface Session { id: string; phone: string; roles: Array<{ role: string; scopeType: string; scopeId: string | null }> }

/** Текущий пользователь кабинета по cookie; null — не авторизован. */
export async function getSession(): Promise<Session | null> {
  if (!(await cookies()).get('sindikat.access')) return null;
  return apiServer<Session>('/auth/me').catch(() => null);
}

export const hasRole = (s: Session | null, ...roles: string[]) => !!s && s.roles.some((r) => r.role === 'SYSTEM_ADMIN' || roles.includes(r.role));
