'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
const COOKIE = 'sindikat.access';
const REFRESH = 'sindikat.refresh';

export async function requestOtp(formData: FormData) {
  const phone = String(formData.get('phone') ?? '').trim();
  // channel — принудительный выбор канала при «код не пришёл»; иначе каскад telegram → vk → sms на стороне API
  const channel = String(formData.get('channel') ?? '') || undefined;
  const res = await fetch(`${API_URL}/auth/otp/request`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone, channel }) });
  if (!res.ok) redirect(`/login?phone=${channel ? encodeURIComponent(phone) : ''}&error=${encodeURIComponent('Не удалось отправить код')}`);
  const r = (await res.json()) as { channel: string; fallbacks: string[] };
  redirect(`/login?phone=${encodeURIComponent(phone)}&channel=${r.channel}&fallbacks=${r.fallbacks.join(',')}`);
}

export async function verifyOtp(formData: FormData) {
  const phone = String(formData.get('phone') ?? '');
  const code = String(formData.get('code') ?? '');
  const res = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, code, consents: [{ type: 'TERMS', version: '1.0' }], device: { platform: 'web' } }),
  });
  if (!res.ok) redirect(`/login?phone=${encodeURIComponent(phone)}&error=${encodeURIComponent('Неверный код')}`);
  const pair = (await res.json()) as { accessToken: string; refreshToken: string; expiresIn: number };
  const jar = await cookies();
  // httpOnly: токен не доступен из JS кабинета; TTL access — из API
  jar.set(COOKIE, pair.accessToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: pair.expiresIn });
  jar.set(REFRESH, pair.refreshToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 3600 });
  redirect('/');
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(REFRESH);
  redirect('/login');
}
