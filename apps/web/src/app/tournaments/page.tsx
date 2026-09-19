import { DISCIPLINE_LABELS_RU, type TournamentSummary } from '@sindikat/domain';
import { STATUS_RU, money } from '@/lib/format';
import Link from 'next/link';
import { apiServer } from '@/lib/api';
import { getSession, hasRole } from '@/lib/session';

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<{ status?: string; discipline?: string }> }) {
  const { status, discipline } = await searchParams;
  const session = await getSession();
  const organizer = hasRole(session, 'ORGANIZER');
  const all = await apiServer<TournamentSummary[]>(organizer ? '/tournaments/mine/all' : '/tournaments').catch(() => [] as TournamentSummary[]);
  const tournaments = all.filter((t) => (!status || t.status === status) && (!discipline || t.discipline === discipline));
  const statuses = [...new Set(all.map((t) => t.status))];
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Турниры</h1><p className="muted">{organizer ? 'включая черновики' : 'опубликованный календарь'}</p></div>
        {organizer && <Link href="/tournaments/new" className="btn">+ новый турнир</Link>}
      </div>
      <div className="toolbar" style={{ marginTop: 16 }}>
        <Link href="/tournaments" className={`pill ${!status && !discipline ? 'ok' : ''}`}>все · {all.length}</Link>
        {statuses.map((s) => <Link key={s} href={`/tournaments?status=${s}`} className={`pill ${status === s ? 'ok' : ''}`}>{STATUS_RU[s]} · {all.filter((t) => t.status === s).length}</Link>)}
        <span style={{ flex: 1 }} />
        {Object.entries(DISCIPLINE_LABELS_RU).map(([k, v]) => <Link key={k} href={`/tournaments?discipline=${k}`} className={`pill ${discipline === k ? 'ok' : 'dim'}`}>{v.toLowerCase()}</Link>)}
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>дата</th><th>название</th><th>дисциплина</th><th>уровень</th><th>статус</th><th>участники</th><th>взнос</th><th /></tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.startsAt).toLocaleDateString('ru-RU')}</td>
                <td><Link href={`/tournaments/${t.id}`}>{t.title}</Link></td>
                <td>{DISCIPLINE_LABELS_RU[t.discipline]}</td>
                <td><span className={`pill ${t.level === 'OPEN' || t.level === 'MAJOR' || t.level === 'GRAND_FINAL' ? 'ok' : ''}`}>{t.level.toLowerCase()}</span></td>
                <td><span className={`pill ${['LIVE', 'REGISTRATION_OPEN'].includes(t.status) ? 'ok' : ['FINALIZED', 'CANCELLED', 'ARCHIVED'].includes(t.status) ? 'dim' : ''}`}>{STATUS_RU[t.status]}</span></td>
                <td className="num">{t.registeredCount} / {t.capacity}</td>
                <td className="num">{money(t.entryFee?.amountMinor)}</td>
                <td>{organizer && <Link href={`/tournaments/${t.id}/edit`} className="muted">изменить</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
