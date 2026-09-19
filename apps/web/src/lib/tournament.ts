import { apiServer } from './api';

export interface TDetail {
  id: string; title: string; status: string; discipline: string; level: string; capacity: number; registeredCount: number; scoringMode: string; formats: string[];
  startsAt: string; endsAt: string; entryFee: { amountMinor: number } | null; description: string | null; protestDeadlineMinutes: number;
  location: { title: string; address: string; meetingPoint: string | null; parking: string | null } | null;
  schedule: Array<{ id: string; at: string; title: string }>;
  rules: Array<{ version: number; scoringSummary: string; fixationSummary: string; allowedTackle: string[]; forbiddenTackle: string[]; penalties: string[]; scoringParams: Record<string, unknown>; publishedAt: string | null }>;
}
export const getTournament = (id: string) => apiServer<TDetail>(`/tournaments/${id}`);
