import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OtpRequest, OtpRequestResult, OtpVerify, TokenPair } from '@sindikat/domain';
import { api, ApiError } from '../api/client';
import { clearSession, getAccessToken, saveSession } from './session';

import type { Discipline } from '@sindikat/domain';

/** GET /v1/me — приватный профиль + сводка сезона. */
export interface Me {
  id: string;
  phone: string;
  roles: Array<{ role: string; scopeType: string; scopeId: string | null }>;
  profile: { displayName: string; cityId: string | null; experienceYears: number | null; bio: string | null; waterTypes: string[]; onboardingCompletedAt: string | null; city: { name: string } | null } | null;
  disciplines: Array<{ discipline: Discipline; priority: number }>;
  season: { rank: number | null; points: number; starts: number; finalProgress: number } | null;
  avatarUrl: string | null;
  privacy: { gearVisibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE'; locationPrivacy: 'EXACT' | 'WATERBODY_ONLY' | 'HIDDEN' };
  createdAt: string;
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      if (!(await getAccessToken())) return null;
      try {
        return await api<Me>('/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });
}

/** Запрос кода; сервер сам выбирает канал (telegram → vk → sms), channel — принудительный выбор при «не пришло». */
export function useRequestOtp() {
  return useMutation({ mutationFn: (dto: OtpRequest) => api<OtpRequestResult>('/auth/otp/request', { method: 'POST', body: dto, auth: false }) });
}

export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: OtpVerify) => api<TokenPair & { isNewUser: boolean }>('/auth/otp/verify', { method: 'POST', body: dto, auth: false }),
    onSuccess: async (pair) => {
      await saveSession(pair);
      await qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api('/auth/logout', { method: 'POST', body: {} }).catch(() => undefined);
      await clearSession();
    },
    onSuccess: () => qc.clear(),
  });
}
