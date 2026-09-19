import Link from 'next/link';
import { apiServer } from '@/lib/api';
import { DISC_RU, STATUS_RU, d, money } from '@/lib/format';
import { getSession } from '@/lib/session';

interface Dash { season: { year: number; title: string } | null; tournaments: Record<string, number>; registrations: Record<string, number>; revenueMinor: number; payments: number; pendingJudge: number; openProtests: number; users: number; posts: number; customGear: number; upcoming: Array<{ id: string; title: string; startsAt: string; status: string; discipline: string; confirmed: number; capacity: number }>; live: Array<{ id: string; title: string; status: string; pendingJudge: number }> }

export default async function Dashboard() {
  const session = await getSession();
  if (!session) return <><h1>Синдикат · CRM</h1><p className="muted">Войдите как организатор или администратор. Демо: +79990000001, код 000000.</p><Link href="/login" className="btn">войти</Link></>;
  const x = await apiServer<Dash>('/admin/dashboard').catch(() => null);
  if (!x) return <><h1>Дашборд</h1><p className="error">Нет доступа: нужна роль ORGANIZER / SYSTEM_ADMIN / SUPPORT.</p></>;
  const t = x.tournaments; const r = x.registrations;
  return (
    <>
      <h1>{x.season?.title ?? 'Сезон'}</h1>
      <p className="muted">{Object.values(t).reduce((a, b) => a + b, 0)} турниров · {x.users} участников · {x.posts} публикаций в сообществе</p>
      <div className="kpis" style={{ marginTop: 20 }}>
        <div className="kpi accent"><div className="v">{money(x.revenueMinor)}</div><div className="l">взносы за сезон · {x.payments} платежей</div></div>
        <div className="kpi"><div className="v">{(r['CONFIRMED'] ?? 0) + (r['CHECKED_IN'] ?? 0) + (r['FINISHED'] ?? 0)}</div><div className="l">подтверждённых заявок</div></div>
        <div className="kpi"><div className="v">{(r['WAITING_PAYMENT'] ?? 0) + (r['WAITING_MEMBERS'] ?? 0)}</div><div className="l">заявок в работе (оплата / напарник)</div></div>
        <div className="kpi"><div className="v">{t['REGISTRATION_OPEN'] ?? 0}</div><div className="l">турниров с открытой регистрацией</div></div>
        <div className="kpi"><div className="v">{t['FINALIZED'] ?? 0}</div><div className="l">финализировано</div></div>
        <div className="kpi" style={x.pendingJudge ? { borderColor: 'var(--orange)' } : undefined}><div className="v">{x.pendingJudge}</div><div className="l">результатов ждут судью</div></div>
        <div className="kpi" style={x.openProtests ? { borderColor: 'var(--orange)' } : undefined}><div className="v">{x.openProtests}</div><div className="l">открытых протестов</div></div>
        <div className="kpi"><div className="v">{x.customGear}</div><div className="l">моделей снастей на модерации</div></div>
      </div>
      <div className="grid2" style={{ marginTop: 24 }}>
        <section className="card">
          <h2>Сейчас</h2>
          {x.live.length === 0 ? <p className="muted">Live-турниров нет</p> : x.live.map((l) => (
            <p key={l.id}><Link href={`/tournaments/${l.id}`}>{l.title}</Link> <span className="pill ok">{STATUS_RU[l.status]}</span> {l.pendingJudge > 0 && <Link href={`/judging/${l.id}`} className="pill warn">{l.pendingJudge} у судьи</Link>}</p>
          ))}
          <h2 style={{ marginTop: 20 }}>Ближайшие старты</h2>
          <table><tbody>{x.upcoming.map((u) => (
            <tr key={u.id}><td>{d(u.startsAt)}</td><td><Link href={`/tournaments/${u.id}`}>{u.title}</Link></td><td className="muted">{DISC_RU[u.discipline]}</td><td className="num">{u.confirmed} / {u.capacity}</td><td><span className={`pill ${u.status === 'REGISTRATION_OPEN' ? 'ok' : 'dim'}`}>{STATUS_RU[u.status]}</span></td></tr>
          ))}</tbody></table>
        </section>
        <section className="card">
          <h2>Быстрые действия</h2>
          <p><Link href="/tournaments/new" className="btn">+ новый турнир</Link></p>
          <p><Link href="/judging" className="btn secondary">очереди судейства</Link></p>
          <p><Link href="/rankings" className="btn secondary">рейтинг и правила сезона</Link></p>
          <p><Link href="/users" className="btn secondary">роли и пользователи</Link></p>
          <h2 style={{ marginTop: 20 }}>Турниры по статусам</h2>
          <table><tbody>{Object.entries(t).map(([s, n]) => <tr key={s}><td>{STATUS_RU[s] ?? s}</td><td className="num">{n}</td></tr>)}</tbody></table>
        </section>
      </div>
    </>
  );
}
