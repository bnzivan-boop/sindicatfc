import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { flushOutbox, readOutbox, subscribeOutbox, type OutboxItem } from './outbox';

/** Состояние очереди + автоповтор: при старте, при возврате приложения на передний план и каждые 30 с. */
export function useOutbox() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const qc = useQueryClient();
  useEffect(() => {
    const load = () => { void readOutbox().then(setItems); };
    load();
    const unsub = subscribeOutbox(load);
    const flush = () => { void flushOutbox().then((n) => { if (n > 0) { void qc.invalidateQueries({ queryKey: ['my-results'] }); void qc.invalidateQueries({ queryKey: ['leaderboard'] }); } }); };
    flush();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && flush());
    const t = setInterval(flush, 30_000);
    return () => { unsub(); sub.remove(); clearInterval(t); };
  }, [qc]);
  return { items, flush: () => flushOutbox() };
}
