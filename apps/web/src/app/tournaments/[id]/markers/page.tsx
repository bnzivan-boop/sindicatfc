import { revalidatePath } from 'next/cache';
import { TournamentTabs } from '@/components/TournamentTabs';
import { apiServer } from '@/lib/api';
import { dt } from '@/lib/format';
import { getTournament } from '@/lib/tournament';

interface Marker { id: string; code: string; validFrom: string; validTo: string }

/** Маркеры турнира — уникальный код на фото результата (handoff §6.5). */
export default async function MarkersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTournament(id);
  const markers = await apiServer<Marker[]>(`/tournaments/${id}/markers`).catch(() => [] as Marker[]);
  const local = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 16);
  const from = local(new Date(new Date(t.startsAt).getTime() - 2 * 3600_000).toISOString());
  const to = local(new Date(new Date(t.endsAt).getTime() + 3600_000).toISOString());

  async function add(fd: FormData) {
    'use server';
    const toIso = (s: string) => new Date(`${s}:00+03:00`).toISOString();
    await apiServer(`/tournaments/${id}/markers`, { method: 'POST', body: JSON.stringify({ code: String(fd.get('code')), validFrom: toIso(String(fd.get('from'))), validTo: toIso(String(fd.get('to'))) }) });
    revalidatePath(`/tournaments/${id}/markers`);
  }

  return (
    <>
      <h1>{t.title}</h1>
      <TournamentTabs id={id} current="/markers" />
      <p className="muted">Маркер печатается на бирке участника; результат без действующего маркера не принимается. Обычно один на турнир, для многодневных — по дню.</p>
      <div className="grid2">
        <div className="card">
          <table><thead><tr><th>код</th><th>действует с</th><th>по</th></tr></thead><tbody>
            {markers.map((m) => <tr key={m.id}><td><b>{m.code}</b></td><td>{dt(m.validFrom)}</td><td>{dt(m.validTo)}</td></tr>)}
            {markers.length === 0 && <tr><td colSpan={3} className="error">Маркеров нет — участники не смогут отправлять результаты</td></tr>}
          </tbody></table>
        </div>
        <form action={add} className="card form">
          <h2>Новый маркер</h2>
          <label>код<input name="code" className="input" required minLength={2} placeholder={`${t.title.split(' ').map((w) => w[0]).join('').toUpperCase()}-${new Date(t.startsAt).getDate()}`} /></label>
          <div className="row"><label>с (МСК)<input name="from" type="datetime-local" className="input" defaultValue={from} required /></label><label>по (МСК)<input name="to" type="datetime-local" className="input" defaultValue={to} required /></label></div>
          <div><button className="btn" type="submit">добавить</button></div>
        </form>
      </div>
    </>
  );
}
