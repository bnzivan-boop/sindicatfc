import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}

/**
 * Серверный fetch к API. Токен — из httpOnly-cookie `sindikat.access`,
 * которую выставляет /login после OTP (этап 1: web-логин для ролей ORGANIZER/JUDGE/ADMIN).
 */
export async function apiServer<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const token = (await cookies()).get('sindikat.access')?.value;
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (init.idempotencyKey) headers.set('idempotency-key', init.idempotencyKey);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json);
  return json as T;
}
