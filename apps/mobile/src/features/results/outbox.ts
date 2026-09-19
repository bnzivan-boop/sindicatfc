import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CreateResultDraft } from '@sindikat/domain';
import { api } from '../../api/client';
import { uploadTo, type PickedImage } from '../media/upload';

/**
 * Offline-очередь отправки результатов (handoff §13): черновик и фото сохраняются на устройстве
 * сразу, отправка идёт шагами и повторяется автоматически, пока не примет сервер.
 * Идемпотентность — по clientId черновика и sha256 фото, так что повтор не плодит дублей.
 */
export interface OutboxItem {
  clientId: string;
  tournamentId: string;
  draft: Omit<CreateResultDraft, 'clientId'>;
  photo: PickedImage;
  /** Шаг, на котором остановились: created → uploaded → submitted */
  stage: 'pending' | 'created' | 'uploaded' | 'submitted';
  resultId?: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

const KEY = 'sindikat.results.outbox';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export async function readOutbox(): Promise<OutboxItem[]> {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]') as OutboxItem[]; } catch { return []; }
}
async function writeOutbox(items: OutboxItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
  notify();
}
export function subscribeOutbox(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export async function enqueue(item: Omit<OutboxItem, 'stage' | 'attempts' | 'createdAt'>) {
  const items = await readOutbox();
  items.push({ ...item, stage: 'pending', attempts: 0, createdAt: new Date().toISOString() });
  await writeOutbox(items);
}

export async function remove(clientId: string) {
  await writeOutbox((await readOutbox()).filter((i) => i.clientId !== clientId));
}

let flushing = false;
/** Прогоняет очередь; каждый элемент продолжает с сохранённого шага. Возвращает число отправленных. */
export async function flushOutbox(onProgress?: (item: OutboxItem) => void): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    const items = await readOutbox();
    for (const item of items) {
      try {
        if (item.stage === 'pending') {
          const draft = await api<{ id: string }>(`/tournaments/${item.tournamentId}/results`, { method: 'POST', body: { ...item.draft, clientId: item.clientId }, idempotencyKey: `result-${item.clientId}` });
          item.resultId = draft.id; item.stage = 'created'; onProgress?.(item); await writeOutbox(items);
        }
        if (item.stage === 'created') {
          await uploadTo(`/results/${item.resultId}/media/upload-url`, item.photo);
          item.stage = 'uploaded'; onProgress?.(item); await writeOutbox(items);
        }
        if (item.stage === 'uploaded') {
          await api(`/results/${item.resultId}/submit`, { method: 'POST', body: {}, idempotencyKey: `submit-${item.clientId}` });
          item.stage = 'submitted'; onProgress?.(item);
          sent += 1;
        }
      } catch (e) {
        item.attempts += 1;
        item.lastError = e instanceof Error ? e.message : String(e);
        // 4xx кроме 401/408/429 — постоянная ошибка (например, турнир не LIVE): оставляем в очереди с текстом, но не долбим
        onProgress?.(item);
      }
    }
    await writeOutbox(items.filter((i) => i.stage !== 'submitted'));
  } finally {
    flushing = false;
  }
  return sent;
}
