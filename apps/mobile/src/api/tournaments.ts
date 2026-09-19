import { useQuery } from '@tanstack/react-query';
import type { TournamentListQuery, TournamentSummary, LeaderboardEntry } from '@sindikat/domain';
import { api } from './client';

export function useTournaments(q: TournamentListQuery = {}) {
  const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined) as [string, string][]).toString();
  return useQuery({ queryKey: ['tournaments', q], queryFn: () => api<TournamentSummary[]>(`/tournaments${params ? `?${params}` : ''}`, { auth: false }) });
}

/** Ответ GET /v1/tournaments/:id (Prisma include) в терминах клиента. */
export interface TournamentDetailView extends TournamentSummary {
  scoringMode: 'LENGTH_SUM' | 'TOTAL_WEIGHT' | 'DUEL_POINTS' | 'PLACE_SUM' | 'BIGGEST_FISH';
  description: string | null;
  endsAt: string;
  protestDeadlineMinutes: number;
  location: { title: string; address: string; meetingPoint: string | null; parking: string | null } | null;
  schedule: Array<{ id: string; at: string; title: string }>;
  rules: Array<{ version: number; allowedTackle: string[]; forbiddenTackle: string[]; scoringSummary: string; fixationSummary: string; penalties: string[] }>;
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: ['tournament', id],
    queryFn: () => api<TournamentDetailView>(`/tournaments/${id}`, { auth: false }),
    enabled: !!id,
  });
}

export function useLeaderboard(id: string) {
  return useQuery({
    queryKey: ['leaderboard', id],
    queryFn: () => api<{ version: number; entries: LeaderboardEntry[]; isFinal: boolean }>(`/tournaments/${id}/leaderboard`, { auth: false }),
    enabled: !!id,
    refetchInterval: 15_000, // fallback; основной канал — SSE (useLiveTournament)
  });
}
