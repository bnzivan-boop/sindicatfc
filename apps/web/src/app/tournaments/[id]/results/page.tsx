import Link from 'next/link';
import { TournamentTabs } from '@/components/TournamentTabs';
import { apiServer } from '@/lib/api';
import { RESULT_STATUS_RU, dt } from '@/lib/format';
import { getTournament } from '@/lib/tournament';

interface Row { id: string; participant: string; participantId: string; species: string; lengthMm: number | null; weightG: number | null; status: string; markerCode: string; capturedAt: string; submittedAt: string | null; judge: string | null; decision: string | null; reason: string | null; corrected: string | null; photoUrl: string | null }

/** Все результаты турнира: полная таблица с фото, судьёй, решением и корректировками. */
export default async function ResultsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> }) {
  const { id } = await params;
  const { status } = await searchParams;
  const t = await getTournament(id);
  const all = await apiServer<Row[]>(`/tournaments/${id}/results`).catch(() => [] as Row[]);
  const rows = status ? all.filter((r) => r.status === status) : all;
  const counts = all.reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
  return (
    <>
      <h1>{t.title}</h1>
      <TournamentTabs id={id} current="/results" />
      <div className="toolbar">
        <Link href={`/tournaments/${id}/results`} className={`pill ${!status ? 'ok' : ''}`}>все · {all.length}</Link>
        {Object.entries(counts).map(([s, n]) => <Link key={s} href={`/tournaments/${id}/results?status=${s}`} className={`pill ${status === s ? 'ok' : ''}`}>{RESULT_STATUS_RU[s]} · {n}</Link>)}
        <span style={{ flex: 1 }} />
        {counts['PENDING_JUDGE'] ? <Link href={`/judging/${id}`} className="btn">судить · {counts['PENDING_JUDGE']}</Link> : null}
      </div>
      <div className="card">
        <table>
          <thead><tr><th>фото</th><th>участник</th><th>рыба</th><th>размер</th><th>маркер</th><th>статус</th><th>судья · решение</th><th>время</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.photoUrl ? <a href={r.photoUrl} target="_blank" rel="noreferrer"><img src={r.photoUrl} alt="" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 6 }} /></a> : <span className="muted">—</span>}</td>
                <td><Link href={`/users/${r.participantId}`}>{r.participant}</Link></td>
                <td>{r.species}</td>
                <td className="num">{r.lengthMm ? `${r.lengthMm / 10} см` : ''}{r.weightG ? ` ${r.weightG} г` : ''}</td>
                <td className="muted">{r.markerCode}</td>
                <td><span className={`pill ${['ACCEPTED', 'CORRECTED'].includes(r.status) ? 'ok' : r.status === 'PENDING_JUDGE' ? 'warn' : ['REJECTED'].includes(r.status) ? 'dim' : ''}`}>{RESULT_STATUS_RU[r.status]}</span></td>
                <td className="muted">{r.judge ?? '—'}{r.reason ? ` · ${r.reason}` : ''}{r.corrected ? ` · корр.: ${r.corrected}` : ''}</td>
                <td className="muted">{r.submittedAt ? dt(r.submittedAt) : dt(r.capturedAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="muted">результатов нет</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
