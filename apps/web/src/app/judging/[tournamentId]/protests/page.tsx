import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { apiServer } from '@/lib/api';

interface Protest { id: string; status: string; targetType: string; targetId: string; text: string; resolution: string | null; deadlineAt: string; createdAt: string; author: { profile: { displayName: string } | null; phone: string } }
const STATUS: Record<string, string> = { OPEN: 'открыт', UNDER_REVIEW: 'рассматривается', UPHELD: 'удовлетворён', DISMISSED: 'отклонён', WITHDRAWN: 'отозван' };

/** Протесты турнира — решает главный судья (роль HEAD_JUDGE в области турнира). */
export default async function ProtestsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const protests = await apiServer<Protest[]>(`/tournaments/${tournamentId}/protests`).catch(() => [] as Protest[]);
  const open = protests.filter((p) => ['OPEN', 'UNDER_REVIEW'].includes(p.status));

  async function resolve(fd: FormData) {
    'use server';
    const id = String(fd.get('id'));
    const status = String(fd.get('status'));
    const lengthCm = String(fd.get('lengthCm') ?? '');
    await apiServer(`/tournaments/${tournamentId}/protests/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status, resolution: String(fd.get('resolution')), lengthMm: lengthCm ? Math.round(Number(lengthCm.replace(',', '.')) * 10) : undefined }),
    });
    revalidatePath(`/judging/${tournamentId}/protests`);
  }

  return (
    <>
      <p><Link href={`/judging/${tournamentId}`} className="muted">← очередь судьи</Link></p>
      <h1>Протесты</h1>
      <p className="muted">{open.length} открытых · {protests.length} всего. Финализация турнира недоступна, пока есть открытые.</p>
      <div className="grid" style={{ marginTop: 24 }}>
        {protests.map((p) => (
          <div key={p.id} className="card" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{p.author.profile?.displayName ?? p.author.phone} · {p.targetType === 'RESULT' ? 'результат' : 'лидерборд'}</strong>
              <span className={`tag ${p.status === 'UPHELD' ? 'accent' : ''}`}>{STATUS[p.status] ?? p.status}</span>
            </div>
            <p style={{ margin: 0 }}>{p.text}</p>
            <div className="muted">подан {new Date(p.createdAt).toLocaleString('ru-RU')} · дедлайн {new Date(p.deadlineAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
            {p.resolution && <div><b>Решение:</b> {p.resolution}</div>}
            {['OPEN', 'UNDER_REVIEW'].includes(p.status) && (
              <form action={resolve} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto auto', gap: 8, alignItems: 'center' }}>
                <input type="hidden" name="id" value={p.id} />
                <input name="resolution" required minLength={5} placeholder="мотивировка решения" className="input" />
                <input name="lengthCm" placeholder="новая длина, см" className="input" disabled={p.targetType !== 'RESULT'} />
                <button className="btn" name="status" value="UPHELD">удовлетворить</button>
                <button className="btn danger" name="status" value="DISMISSED">отклонить</button>
              </form>
            )}
          </div>
        ))}
        {protests.length === 0 && <p className="card muted">Протестов нет</p>}
      </div>
    </>
  );
}
