import Constants from 'expo-constants';
import { clearSession, getAccessToken, getRefreshToken, saveSession } from '../auth/session';

/** База API: EXPO_PUBLIC_API_URL или хост Metro (для симулятора/устройства в одной сети). */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:3000/v1`;
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(typeof body === 'object' && body && 'message' in body ? String((body as { message: unknown }).message) : `HTTP ${status}`);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Изменяющие запросы к регистрации/оплате/результатам требуют ключ (handoff, раздел 8). */
  idempotencyKey?: string;
  auth?: boolean;
}

let refreshing: Promise<boolean> | null = null;

/** Обновляет пару токенов по refresh; параллельные 401 ждут один и тот же запрос. */
async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;
      const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
      if (!res.ok) {
        await clearSession();
        return false;
      }
      await saveSession(await res.json());
      return true;
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function api<T>(path: string, opts: RequestOptions = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey;
  if (opts.auth !== false) {
    const token = await getAccessToken();
    if (token) headers['authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { method: opts.method ?? 'GET', headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  if (res.status === 401 && opts.auth !== false && retry && (await refreshSession())) {
    return api<T>(path, opts, false);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json);
  return json as T;
}
