import type { TournamentSummary } from '@sindikat/domain';
import Link from 'next/link';
import { apiServer } from '@/lib/api';

export default async function JudgingIndex() {
  const tournaments = await apiServer<TournamentSummary[]>('/tournaments').catch(() => [] as TournamentSummary[]);
  const active = tournaments.filter((t) => ['REGISTRATION_CLOSED', 'LIVE', 'JUDGING'].includes(t.status));
  return (
    <>
      <h1>Судейство</h1>
      <p className="muted">Очередь проверки результатов и протесты по активным турнирам. Судья видит только турниры, где ему выдана роль.</p>
      <div className="card" style={{ marginTop: 24 }}>
        {active.length === 0 ? <p className="muted">Активных турниров нет</p> : (
          <table><tbody>{active.map((t) => (
            <tr key={t.id}><td><Link href={`/judging/${t.id}`}>{t.title}</Link></td><td><span className="pill ok">{t.status.toLowerCase()}</span></td><td><Link href={`/judging/${t.id}`} className="btn sm">очередь</Link> <Link href={`/judging/${t.id}/protests`} className="btn secondary sm">протесты</Link> <Link href={`/tournaments/${t.id}/protocol`} className="btn secondary sm">протокол</Link></td></tr>
          ))}</tbody></table>
        )}
      </div>
    </>
  );
}
