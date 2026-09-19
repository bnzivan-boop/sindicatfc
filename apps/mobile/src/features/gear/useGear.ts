import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpsertBoat, UpsertGearKit } from '@sindikat/domain';
import { api } from '../../api/client';

export interface GearKitRow extends UpsertGearKit { id: string; createdAt: string }
export interface BoatRow { id: string; type: string; customName: string | null; lengthCm: number | null; seats: number | null; capacityKg: number | null; equipment: { motor?: { customBrand?: string; customModel?: string; powerHp?: number }; electricMotor?: string; sonar?: string; trailer?: boolean } | null; availableForTeamTrips: boolean }

export const useGearKits = () => useQuery({ queryKey: ['gear-kits'], queryFn: () => api<GearKitRow[]>('/me/gear-kits') });
export const useGearKit = (id?: string) => useQuery({ queryKey: ['gear-kit', id], queryFn: () => api<GearKitRow>(`/me/gear-kits/${id}`), enabled: !!id });
export const useBoat = () => useQuery({ queryKey: ['boat'], queryFn: () => api<BoatRow | null>('/me/boat') });

export function useSaveKit(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertGearKit) => (id ? api(`/me/gear-kits/${id}`, { method: 'PATCH', body: dto }) : api('/me/gear-kits', { method: 'POST', body: dto })),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['gear-kits'] }); void qc.invalidateQueries({ queryKey: ['gear-kit', id] }); },
  });
}
export function useDeleteKit() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/me/gear-kits/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['gear-kits'] }) });
}
export function useSaveBoat() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (dto: UpsertBoat) => api('/me/boat', { method: 'PUT', body: dto }), onSuccess: () => qc.invalidateQueries({ queryKey: ['boat'] }) });
}
