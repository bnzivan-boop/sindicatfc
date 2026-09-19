import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateResultDraft, ResultStatus } from '@sindikat/domain';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { api } from '../../api/client';
import type { PickedImage } from '../media/upload';
import { enqueue, flushOutbox, remove } from './outbox';

export interface ResultRow { id: string; status: ResultStatus; lengthMm: number | null; weightG: number | null; capturedAt: string; species: { nameRu: string }; photoUrl: string | null; decisions: Array<{ decision: string; reason: string | null }> }

export const useMyResults = (tournamentId: string) => useQuery({ queryKey: ['my-results', tournamentId], queryFn: () => api<ResultRow[]>(`/tournaments/${tournamentId}/results/mine`), enabled: !!tournamentId });

/** Состояния из handoff §13: на устройстве → загружается → отправлено → принято сервером. */
export type UploadState = 'ON_DEVICE' | 'CREATING' | 'UPLOADING' | 'SUBMITTING' | 'SENT' | 'QUEUED' | 'ERROR';

/**
 * Отправка результата: черновик (идемпотентен по clientId) → upload-url → PUT фото → submit.
 * clientId создаётся один раз на попытку, так что повтор после обрыва связи не плодит дубли.
 */
/**
 * Отправка результата через offline-очередь: сначала запись на устройство (ничего не теряется
 * при закрытии экрана), затем попытка отправить сразу. Если связи нет — отправится автоматически позже.
 */
export function useSubmitResult(tournamentId: string) {
  const qc = useQueryClient();
  const [state, setState] = useState<UploadState>('ON_DEVICE');
  const [clientId] = useState(() => Crypto.randomUUID());

  const mutation = useMutation({
    mutationFn: async (input: { draft: Omit<CreateResultDraft, 'clientId'>; photo: PickedImage }) => {
      await enqueue({ clientId, tournamentId, draft: input.draft, photo: input.photo });
      setState('CREATING');
      let failed: string | undefined;
      await flushOutbox((item) => {
        if (item.clientId !== clientId) return;
        if (item.lastError && item.attempts > 0 && item.stage !== 'submitted') failed = item.lastError;
        else setState(item.stage === 'created' ? 'UPLOADING' : item.stage === 'uploaded' ? 'SUBMITTING' : item.stage === 'submitted' ? 'SENT' : 'CREATING');
      });
      if (failed) {
        // постоянная ошибка сервера (валидация, статус турнира) — убираем из очереди и показываем
        if (/недопустим|не в статусе|недействителен|Вы не участник|Ошибка валидации/i.test(failed)) { await remove(clientId); throw new Error(failed); }
        setState('QUEUED');
        return null;
      }
      return true;
    },
    onError: () => setState('ERROR'),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['my-results', tournamentId] }); void qc.invalidateQueries({ queryKey: ['leaderboard', tournamentId] }); },
  });
  return { ...mutation, state };
}
