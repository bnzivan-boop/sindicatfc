import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ParticipationFormat, RegistrationStatus, TournamentStatus } from '@sindikat/domain';
import * as Crypto from 'expo-crypto';
import { api } from '../../api/client';

export interface Member { id: string; userId: string | null; invitedPhone: string | null; role: string; invitationStatus: string; user: { profile: { displayName: string } | null } | null }
export interface Registration {
  id: string; tournamentId: string; ownerId: string; format: ParticipationFormat; status: RegistrationStatus; amountMinor: number | null; startNumber: string | null; createdAt: string;
  members: Member[]; payments: Array<{ status: string; paidAt: string | null }>;
  tournament?: { id: string; title: string; startsAt: string; status: TournamentStatus; discipline: string; level: string };
}
export interface Invitation { id: string; registration: { id: string; format: ParticipationFormat; tournament: { id: string; title: string; startsAt: string }; owner: { profile: { displayName: string } | null } } }
export interface UserHit { id: string; displayName: string; city: string | null; discipline: string | null }

export const STATUS_RU: Record<RegistrationStatus, string> = {
  DRAFT: 'черновик', WAITING_MEMBERS: 'ждём напарника', WAITING_PAYMENT: 'ожидает оплаты', CONFIRMED: 'подтверждена', CHECKED_IN: 'на старте', FINISHED: 'завершена',
  WAITLISTED: 'лист ожидания', PAYMENT_FAILED: 'оплата не прошла', CANCELLED: 'отменена', REFUND_PENDING: 'возврат', REFUNDED: 'возвращено', REJECTED: 'отклонена',
};
export const FORMAT_RU: Record<ParticipationFormat, string> = { SOLO: 'личный зачёт', PAIR: 'парный зачёт', TEAM: 'командный зачёт', CREW: 'экипаж' };

const keys = { mine: ['my-registrations'], one: (id: string) => ['registration', id], inv: ['invitations'] };

export const useMyRegistrations = (enabled = true) => useQuery({ queryKey: keys.mine, queryFn: () => api<Registration[]>('/me/registrations'), enabled });
export const useRegistration = (id: string) => useQuery({ queryKey: keys.one(id), queryFn: () => api<Registration>(`/registrations/${id}`), enabled: !!id });
export const useInvitations = (enabled = true) => useQuery({ queryKey: keys.inv, queryFn: () => api<Invitation[]>('/me/invitations'), enabled });
export const useUserSearch = (q: string) => useQuery({ queryKey: ['user-search', q], queryFn: () => api<UserHit[]>(`/users?q=${encodeURIComponent(q)}`, { auth: false }), enabled: q.trim().length >= 2 });

function useInvalidate() {
  const qc = useQueryClient();
  return (id?: string) => { void qc.invalidateQueries({ queryKey: keys.mine }); void qc.invalidateQueries({ queryKey: keys.inv }); void qc.invalidateQueries({ queryKey: ['tournament'] }); if (id) void qc.invalidateQueries({ queryKey: keys.one(id) }); };
}

export function useCreateRegistration(tournamentId: string) {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (format: ParticipationFormat) => api<Registration>(`/tournaments/${tournamentId}/registrations`, { method: 'POST', body: { format }, idempotencyKey: `reg-${tournamentId}-${Crypto.randomUUID()}` }), onSuccess: () => inv() });
}
export function useInvite(registrationId: string) {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (dto: { userId?: string; phone?: string }) => api(`/registrations/${registrationId}/members/invite`, { method: 'POST', body: dto, idempotencyKey: `inv-${registrationId}-${Crypto.randomUUID()}` }), onSuccess: () => inv(registrationId) });
}
export function usePay(registrationId: string) {
  const inv = useInvalidate();
  return useMutation({ mutationFn: () => api(`/registrations/${registrationId}/payments`, { method: 'POST', body: {}, idempotencyKey: `pay-${registrationId}-${Crypto.randomUUID()}` }), onSuccess: () => inv(registrationId) });
}
export function useCancel(registrationId: string) {
  const inv = useInvalidate();
  return useMutation({ mutationFn: () => api(`/registrations/${registrationId}/cancel`, { method: 'POST', body: {}, idempotencyKey: `cancel-${registrationId}-${Crypto.randomUUID()}` }), onSuccess: () => inv(registrationId) });
}
export function useRespondInvitation() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: ({ registrationId, accept }: { registrationId: string; accept: boolean }) => api(`/registrations/${registrationId}/members/${accept ? 'accept' : 'decline'}`, { method: 'POST', body: {}, idempotencyKey: `resp-${registrationId}-${Crypto.randomUUID()}` }), onSuccess: () => inv() });
}
