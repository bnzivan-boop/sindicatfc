import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export interface ChannelRow { id: string; slug: string; name: string; kind: 'OFFICIAL' | 'LOCAL'; city: string | null; description: string | null; members: number; posts: number; lastPost: string | null; joined: boolean }
export interface ChannelDetail extends Omit<ChannelRow, 'lastPost'> { owner: string | null; admins: number; rubrics: Array<{ id: string; name: string; posts: number }> }
export interface PostRow { id: string; author: { id: string; displayName: string; city: string | null }; channel: { id: string; name: string; kind: string }; rubric: string | null; title: string; text: string; createdAt: string; likes: number; comments: number; likedByMe: boolean }
export interface PostDetail extends PostRow { comments: number; commentList?: never; }
export interface PostComment { id: string; authorId: string; author: string; text: string; createdAt: string }

export const useChannels = () => useQuery({ queryKey: ['channels'], queryFn: () => api<ChannelRow[]>('/community/channels') });
export const useChannel = (id: string) => useQuery({ queryKey: ['channel', id], queryFn: () => api<ChannelDetail>(`/community/channels/${id}`), enabled: !!id });
export const usePosts = (channelId?: string) => useQuery({ queryKey: ['posts', channelId ?? 'all'], queryFn: () => api<PostRow[]>(`/community/posts?limit=30${channelId ? `&channelId=${channelId}` : ''}`) });
export const usePost = (id: string) => useQuery({ queryKey: ['post', id], queryFn: () => api<PostRow & { comments: PostComment[] }>(`/community/posts/${id}`), enabled: !!id });

export function useJoinChannel(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api<{ joined: boolean; members: number }>(`/community/channels/${id}/join`, { method: 'POST', body: {} }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['channel', id] }); void qc.invalidateQueries({ queryKey: ['channels'] }); } });
}
export function useLikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ liked: boolean; likes: number }>(`/community/posts/${id}/like`, { method: 'POST', body: {} }).then((r) => ({ id, ...r })),
    onSuccess: (r) => {
      const patch = (p: PostRow) => (p.id === r.id ? { ...p, likes: r.likes, likedByMe: r.liked } : p);
      qc.setQueriesData<PostRow[]>({ queryKey: ['posts'] }, (d) => d?.map(patch));
      qc.setQueryData<PostRow & { comments: PostComment[] }>(['post', r.id], (d) => (d ? { ...d, likes: r.likes, likedByMe: r.liked } : d));
    },
  });
}
export function useCommentPost(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (text: string) => api<PostComment>(`/community/posts/${id}/comments`, { method: 'POST', body: { text } }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['post', id] }); void qc.invalidateQueries({ queryKey: ['posts'] }); } });
}
export function useCreatePost(channelId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (dto: { title: string; text: string; rubricId?: string }) => api<PostRow>(`/community/channels/${channelId}/posts`, { method: 'POST', body: dto }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['posts'] }); void qc.invalidateQueries({ queryKey: ['channel', channelId] }); } });
}
export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (dto: { name: string; city?: string; description?: string }) => api<{ id: string }>('/community/channels', { method: 'POST', body: dto }), onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }) });
}
export const ago = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000); return m < 1 ? 'только что' : m < 60 ? `${m} мин назад` : m < 1440 ? `${Math.round(m / 60)} ч назад` : `${Math.round(m / 1440)} дн назад`; };

/* ── выезды и клубы ── */
export interface TripRow { id: string; title: string; place: string; startsAt: string; seats: number; seatsLeft: number; details: string | null; discipline: string | null; author: { id: string; displayName: string; meta: string }; isAuthor: boolean; myStatus: string | null; requests: string[] }
export interface MatchRow { id: string; displayName: string; city: string | null; score: number; reasons: string[] }
export interface ClubRow { id: string; name: string; city: string | null; discipline: string; recruiting: boolean; members: number; points: number; rank: number; myRole: string | null }
export interface ClubDetail extends ClubRow { description: string | null; foundedYear: number; isCaptain: boolean; roster: Array<{ userId: string; displayName: string; role: string; rank: number | null; points: number }>; applicants: Array<{ userId: string; displayName: string }>; slots: Array<{ id: string; title: string; note: string | null }>; wins: number; podiums: number; starts: number }

export const useTrips = () => useQuery({ queryKey: ['trips'], queryFn: () => api<TripRow[]>('/community/trips') });
export const useMatches = () => useQuery({ queryKey: ['matches'], queryFn: () => api<MatchRow[]>('/community/matches') });
export const useClubs = () => useQuery({ queryKey: ['clubs'], queryFn: () => api<ClubRow[]>('/community/clubs') });
export const useClub = (id: string) => useQuery({ queryKey: ['club', id], queryFn: () => api<ClubDetail>(`/community/clubs/${id}`), enabled: !!id });
export function useJoinTrip() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => api(`/community/trips/${id}/join`, { method: 'POST', body: {} }), onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }) }); }
export function useDecideTrip() { const qc = useQueryClient(); return useMutation({ mutationFn: (v: { id: string; userId: string; accept: boolean }) => api(`/community/trips/${v.id}/decide`, { method: 'POST', body: { userId: v.userId, accept: v.accept } }), onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }) }); }
export function useCreateTrip() { const qc = useQueryClient(); return useMutation({ mutationFn: (dto: { title: string; place: string; startsAt: string; seats: number; details?: string }) => api<{ id: string }>('/community/trips', { method: 'POST', body: dto }), onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }) }); }
export function useApplyClub(id: string) { const qc = useQueryClient(); return useMutation({ mutationFn: () => api(`/community/clubs/${id}/apply`, { method: 'POST', body: {} }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['club', id] }); void qc.invalidateQueries({ queryKey: ['clubs'] }); } }); }
export function useDecideClub(id: string) { const qc = useQueryClient(); return useMutation({ mutationFn: (v: { userId: string; accept: boolean }) => api(`/community/clubs/${id}/decide`, { method: 'POST', body: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ['club', id] }) }); }
export function useCreateClub() { const qc = useQueryClient(); return useMutation({ mutationFn: (dto: { name: string; city?: string; discipline: string; recruiting: boolean; description?: string }) => api<{ id: string }>('/community/clubs', { method: 'POST', body: dto }), onSuccess: () => qc.invalidateQueries({ queryKey: ['clubs'] }) }); }
export const when = (iso: string) => { const d = new Date(iso); const today = new Date(); const diff = Math.round((d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86_400_000); const t = new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); return `${diff === 0 ? 'сегодня' : diff === 1 ? 'завтра' : new Date(iso).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })} · ${t}`; };
