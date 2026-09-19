import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export interface TrophyComment { id: string; authorId: string; author: string; text: string; createdAt: string }
export interface TrophyDetail {
  id: string; owner: { id: string; displayName: string; city: string | null }; species: string; lengthMm: number | null; weightG: number | null; description: string | null; caughtAt: string;
  photos: string[]; gear: { kitId: string | null; kitName: string | null; rod: string | null; freeText: string | null } | null; waterbody: string | null; locationPrivacy: string;
  tournament: { id: string; title: string } | null; isPersonalRecord: boolean; likes: number; likedByMe: boolean; comments: TrophyComment[];
}
export interface FeedItem { id: string; owner: { id: string; displayName: string; city: string | null }; species: string; lengthMm: number | null; weightG: number | null; description: string | null; photo: string | null; waterbody: string | null; isPersonalRecord: boolean; publishedAt: string; likes: number; comments: number; likedByMe: boolean }

export const useTrophy = (id: string) => useQuery({ queryKey: ['trophy', id], queryFn: () => api<TrophyDetail>(`/trophies/${id}`), enabled: !!id });
export const useTrophyFeed = () => useQuery({ queryKey: ['feed-trophies'], queryFn: () => api<{ items: FeedItem[]; nextCursor: string | null }>('/feed/trophies?limit=30') });

export function useLikeTrophy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ liked: boolean; likes: number }>(`/trophies/${id}/like`, { method: 'POST', body: {} }),
    onSuccess: (r) => {
      qc.setQueryData<TrophyDetail>(['trophy', id], (t) => (t ? { ...t, likes: r.likes, likedByMe: r.liked } : t));
      void qc.invalidateQueries({ queryKey: ['feed-trophies'] });
    },
  });
}
export function useCommentTrophy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => api<TrophyComment>(`/trophies/${id}/comments`, { method: 'POST', body: { text } }),
    onSuccess: (c) => { qc.setQueryData<TrophyDetail>(['trophy', id], (t) => (t ? { ...t, comments: [...t.comments, c] } : t)); void qc.invalidateQueries({ queryKey: ['feed-trophies'] }); },
  });
}
export function useDeleteComment(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (commentId: string) => api(`/trophies/${id}/comments/${commentId}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['trophy', id] }) });
}

export const fmtFish = (lengthMm: number | null, weightG: number | null) => [lengthMm ? `${lengthMm / 10} см` : null, weightG ? (weightG >= 1000 ? `${(weightG / 1000).toFixed(2)} кг` : `${weightG} г`) : null].filter(Boolean).join(' · ');
