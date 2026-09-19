import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { API_URL } from './client';

/**
 * Подписка на SSE /v1/live/tournaments/:id (handoff, 4.1 и 12: обновление ≤ 3 с).
 * TODO(этап 3): в RN нет нативного EventSource — подключить react-native-sse
 * или перейти на WebSocket. Сейчас хук только инвалидирует запросы по таймеру
 * на web, где EventSource есть.
 */
export function useLiveTournament(tournamentId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!tournamentId || typeof EventSource === 'undefined') return;
    const es = new EventSource(`${API_URL}/live/tournaments/${tournamentId}`);
    const onEvent = () => {
      void qc.invalidateQueries({ queryKey: ['leaderboard', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['my-results', tournamentId] });
    };
    es.addEventListener('leaderboard.updated', onEvent);
    es.addEventListener('result.status', onEvent);
    return () => es.close();
  }, [tournamentId, qc]);
}
