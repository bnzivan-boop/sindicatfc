import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCatch, LocationPrivacy } from '@sindikat/domain';
import { api } from '../../api/client';

export interface Species { id: string; slug: string; nameRu: string; isPredator: boolean }
export interface CatchRow {
  id: string; speciesId: string; lengthMm: number | null; weightG: number | null; description: string | null; caughtAt: string;
  species: Species; media: unknown[]; photoUrls: string[]; _count: { likes: number; comments: number }; trophy: { isPersonalRecord: boolean; status: string } | null; location: { privacy: LocationPrivacy } | null;
}

export const useSpecies = () => useQuery({ queryKey: ['species'], queryFn: () => api<Species[]>('/species', { auth: false }), staleTime: 3_600_000 });
export const useCatches = () => useQuery({ queryKey: ['catches'], queryFn: () => api<CatchRow[]>('/me/catches') });

export function useCreateCatch() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (dto: CreateCatch) => api<{ id: string }>('/me/catches', { method: 'POST', body: dto }), onSuccess: () => qc.invalidateQueries({ queryKey: ['catches'] }) });
}
export function usePromoteTrophy() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/me/catches/${id}/promote-to-trophy`, { method: 'POST', body: {} }), onSuccess: () => qc.invalidateQueries({ queryKey: ['catches'] }) });
}
export function useDeleteCatch() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/me/catches/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['catches'] }) });
}
