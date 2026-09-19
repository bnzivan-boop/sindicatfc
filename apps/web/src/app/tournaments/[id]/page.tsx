import { tournamentMachine, type TournamentStatus } from '@sindikat/domain';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TournamentTabs } from '@/components/TournamentTabs';
import { ApiError, apiServer } from '@/lib/api';
import { DISC_RU, FORMAT_RU, STATUS_RU, dt, money } from '@/lib/format';
import { getSession, hasRole } from '@/lib/session';
import { getTournament } from '@/lib/tournament';

interface Ops { checklist: Array<{ status: string }>; budget: Array<{ amountMinor: number; kind: string }>; prizeFundMinor: number | null }

/** Обзор турнира: статус и переходы, готовность, ключевые цифры (прототип organizer-view). */
export default async function TournamentOverview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await getSession();
  const organizer = hasRole(session, 'ORGANIZER');
  const t = await getTournament(id);
  const ops = organizer ? await apiServer<Ops>(`/tournaments/${id}/ops`).catch(() => null) : null;
  const regs = organizer ? await apiServer<Array<{ status: string }>>(`/tournaments/${id}/registrations`).catch(() => []) : [];
  const results = organizer ? await apiServer<Array<{ status: string }>>(`/tournaments/${id}/results`).catch(() => []) : [];
  const next = tournamentMachine.nextStates(t.status as TournamentStatus);
  const rules = t.rules[0];
  const done = ops?.checklist.filter((c) => c.status === 'DONE').length ?? 0;
  const total = ops?.checklist.filter((c) => c.status !== 'NA').length ?? 0;
  const income = ops?.budget.filter((b) => b.kind === 'INCOME').reduce((s, b) => s + b.amountMinor, 0) ?? 0;
  const expense = ops?.budget.filter((b) => b.kind === 'EXPENSE').reduce((s, b) => s + b.amountMinor, 0) ?? 0;
  const confirmed = regs.filter((r) => ['CONFIRMED', 'CHECKED_IN', 'FINISHED'].includes(r.status)).length;
  const daysLeft = Math.ceil((new Date(t.startsAt).getTime() - Date.now()) / 86_400_000);

  async function transition(formData: FormData) {
    'use server';
    try { await apiServer(`/tournaments/${id}/transition`, { method: 'POST', body: JSON.stringify({ to: String(formData.get('to')) }) }); }
    catch (e) { redirect(`/tournaments/${id}?error=${encodeURIComponent(e instanceof ApiError && typeof e.body === 'object' && e.body && 'message' in e.body ? String((e.body as { message: unknown }).message) : 'ошибка')}`); }
    revalidatePath(`/tournaments/${id}`); redirect(`/tournaments/${id}`);
  }
  async function duplicate() {
    'use server';
    const copy = await apiServer<{ id: string }>(`/tournaments/${id}/duplicate`, { method: 'POST' });
    redirect(`/tournaments/${copy.id}/edit`);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1>{t.title}</h1>
          <p className="muted">{dt(t.startsAt)} · {t.location?.title} · {DISC_RU[t.discipline]} · {t.level} · <span className={`pill ${['LIVE', 'REGISTRATION_OPEN'].includes(t.status) ? 'ok' : ''}`}>{STATUS_RU[t.status]}</span></p>
        </div>
        {organizer && <div className="toolbar"><Link href={`/tournaments/${id}/edit`} className="btn secondary">изменить</Link><form action={duplicate}><button className="btn secondary" type="submit">дублировать</button></form></div>}
      </div>
      <TournamentTabs id={id} current="" />
      {error && <p className="error">{error}</p>}

      <div className="kpis">
        <div className="kpi accent"><div className="v">{total ? `${Math.round((done / total) * 100)}%` : '—'}</div><div className="l">готовность · {daysLeft > 0 ? `${daysLeft} дн до старта` : 'старт прошёл'}</div></div>
        <div className="kpi"><div className="v">{confirmed} <span className="muted" style={{ fontSize: 14 }}>/ {t.capacity}</span></div><div className="l">участники</div></div>
        <div className="kpi"><div className="v">{money(income - expense)}</div><div className="l">бюджет · {ops?.prizeFundMinor ? `приз ${money(ops.prizeFundMinor)}` : 'без призового'}</div></div>
        <div className="kpi"><div className="v">{results.filter((r) => r.status === 'ACCEPTED' || r.status === 'CORRECTED').length}</div><div className="l">результатов принято · {results.filter((r) => r.status === 'PENDING_JUDGE').length} у судьи</div></div>
      </div>

      <div className="grid2" style={{ marginTop: 20 }}>
        <section className="card">
          <h2>Карточка</h2>
          <p>{money(t.entryFee?.amountMinor)} взнос · форматы: {t.formats.map((f) => FORMAT_RU[f]).join(', ')} · протесты {t.protestDeadlineMinutes} мин</p>
          <p className="muted">{t.location?.address}{t.location?.meetingPoint ? ` · сбор: ${t.location.meetingPoint}` : ''}{t.location?.parking ? ` · парковка: ${t.location.parking}` : ''}</p>
          {t.description && <p className="muted">{t.description}</p>}
          <h2 style={{ marginTop: 16 }}>Тайминг</h2>
          {t.schedule.length === 0 && <p className="muted">не задан</p>}
          {t.schedule.map((s) => <p key={s.id}><span className="muted">{new Date(s.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })}</span> · {s.title}</p>)}
          <h2 style={{ marginTop: 16 }}>Регламент {rules ? `v${rules.version}` : ''}</h2>
          {!rules ? <p className="error">Не опубликован — регистрацию открыть нельзя. <Link href={`/tournaments/${id}/edit`}>Добавить</Link> или применить шаблон дисциплины.</p> : <><p><b>Зачёт:</b> {rules.scoringSummary}</p><p className="muted"><b>Фиксация:</b> {rules.fixationSummary}</p></>}
        </section>
        <section className="card" style={{ alignSelf: 'start' }}>
          <h2>Статус</h2>
          <p className="muted">Переходы по статусной машине (handoff §7.1):</p>
          {t.status === 'JUDGING' && <p className="muted">Финализация закроет протесты, зафиксирует протокол, начислит очки сезона и уведомит участников. <Link href={`/judging/${id}/protests`}>Протесты</Link>.</p>}
          {organizer ? (
            <form action={transition} style={{ display: 'grid', gap: 8 }}>
              {next.map((s) => <button key={s} className={`btn ${s === 'CANCELLED' ? 'danger' : s === 'FINALIZED' || s === 'REGISTRATION_OPEN' || s === 'LIVE' ? '' : 'secondary'}`} name="to" value={s} type="submit">→ {STATUS_RU[s]}</button>)}
              {next.length === 0 && <p className="muted">Конечное состояние</p>}
            </form>
          ) : <p className="muted"><Link href="/login">Войдите</Link> как организатор</p>}
        </section>
      </div>
    </>
  );
}
