import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export type FriendState = 'NONE' | 'FRIENDS' | 'OUTGOING' | 'INCOMING' | 'BLOCKED' | 'BLOCKED_BY' | 'SELF';
export interface FriendCard { id: string; displayName: string; city: string | null; discipline: string | null; rank: number | null; since?: string; lastSeenAt?: string | null }
export interface Suggestion extends FriendCard { reasons: string[]; score: number }

export const useFriends = (enabled = true) => useQuery({ queryKey: ['friends'], queryFn: () => api<{ friends: FriendCard[]; incoming: FriendCard[]; outgoing: FriendCard[] }>('/me/friends'), enabled });
export const useFriendSuggestions = (enabled = true) => useQuery({ queryKey: ['friend-suggestions'], queryFn: () => api<Suggestion[]>('/me/friends/suggestions'), enabled });
export const useFriendStatus = (userId?: string, enabled = true) => useQuery({ queryKey: ['friend-status', userId], queryFn: () => api<{ state: FriendState; mutual: number }>(`/me/friends/status/${userId}`), enabled: !!userId && enabled });

/** Одна мутация на все действия — кнопка сама решает, что вызвать по текущему состоянию. */
export function useFriendAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: 'request' | 'accept' | 'decline' | 'remove' | 'block' | 'unblock' }) =>
      action === 'remove' ? api(`/me/friends/${userId}`, { method: 'DELETE' }) : api<{ state: FriendState }>(`/me/friends/${userId}/${action}`, { method: 'POST', body: {} }),
    onSuccess: (_r, v) => { void qc.invalidateQueries({ queryKey: ['friends'] }); void qc.invalidateQueries({ queryKey: ['friend-suggestions'] }); void qc.invalidateQueries({ queryKey: ['friend-status', v.userId] }); void qc.invalidateQueries({ queryKey: ['public-profile', v.userId] }); void qc.invalidateQueries({ queryKey: ['public-kits', v.userId] }); void qc.invalidateQueries({ queryKey: ['notifications-unread'] }); },
  });
}
