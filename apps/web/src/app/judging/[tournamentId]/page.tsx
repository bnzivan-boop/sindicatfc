import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { apiServer } from '@/lib/api';

interface QueueItem {
  id: string; lengthMm: number | null; weightG: number | null; submittedAt: string; markerCode: string;
  species: { nameRu: string };
  participant: { profile: { displayName: string } | null };
  media: Array<{ fileId: string }>;
  photoUrl: string | null;
}

/** Очередь судьи (прототип org-judges): засчитать / отклонить / запросить фото. */
export default async function JudgingQueuePage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const queue = await apiServer<QueueItem[]>(`/tournaments/${tournamentId}/judging/queue`).catch(() => [] as QueueItem[]);

  async function decide(formData: FormData) {
    'use server';
    const resultId = String(formData.get('resultId'));
    const decision = String(formData.get('decision'));
    const reason = String(formData.get('reason') ?? '') || undefined;
    await apiServer(`/tournaments/${tournamentId}/results/${resultId}/judge-decisions`, { method: 'POST', body: JSON.stringify({ decision, reason }) });
    revalidatePath(`/judging/${tournamentId}`);
  }

  return (
    <>
      <p><Link href={`/judging/${tournamentId}/protests`}>протесты →</Link></p>
      <h1>Очередь проверки</h1>
      <p className="muted">{queue.length} результатов ожидают решения · показываются только полностью загруженные</p>
      <div className="grid" style={{ marginTop: 24 }}>
        {queue.map((r) => (
          <form key={r.id} action={decide} className="card" style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 16, alignItems: 'center' }}>
            {r.photoUrl ? (
              <a href={r.photoUrl} target="_blank" rel="noreferrer"><img src={r.photoUrl} alt="фото результата" style={{ width: 220, height: 165, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--line)' }} /></a>
            ) : (
              <div className="muted" style={{ width: 220, height: 165, display: 'grid', placeItems: 'center', border: '1px dashed var(--line)', borderRadius: 12 }}>нет фото</div>
            )}
            <div>
              <strong>{r.participant.profile?.displayName ?? '—'}</strong> · {r.species.nameRu} {r.lengthMm ? `${r.lengthMm / 10} см` : ''} {r.weightG ? `${r.weightG} г` : ''}
              <div className="muted">маркер {r.markerCode} · фото {r.media.length} · {new Date(r.submittedAt).toLocaleTimeString('ru-RU')}</div>
              <input name="reason" placeholder="причина (для отклонения / повторного фото)" style={{ marginTop: 8, width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <input type="hidden" name="resultId" value={r.id} />
              <button className="btn" name="decision" value="ACCEPT">засчитать</button>
              <button className="btn secondary" name="decision" value="REQUEST_RESUBMISSION">запросить фото</button>
              <button className="btn danger" name="decision" value="REJECT">отклонить</button>
            </div>
          </form>
        ))}
        {queue.length === 0 && <p className="card muted">Очередь пуста</p>}
      </div>
    </>
  );
}
