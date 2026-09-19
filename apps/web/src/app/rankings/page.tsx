import { DISCIPLINE_LABELS_RU, Discipline } from '@sindikat/domain';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ApiError, apiServer } from '@/lib/api';
import { dt } from '@/lib/format';
import { getSession, hasRole } from '@/lib/session';

interface Row { userId: string; rank: number; points: string; starts: number; user: { profile: { displayName: string } | null } }
interface Season { id: string; year: number; title: string; isActive: boolean }
interface Rules { id: string; discipline: string | null; version: string; activeFrom: string; payload: { levelCoefficients: Record<string, number>; disciplineCoefficients: Record<string, number>; bestResultsCount: number | null; minStartsForFinal: number; basePointsByPlace: number[]; floorPoints: number; tieBreakers: string[] } }
interface Ledger { id: string; user: string; userId: string; discipline: string; tournament: string | null; type: string; delta: number; rulesVersion: string; reason: string | null; createdAt: string }

/** Рейтинг сезона + правила (коэффициенты — только здесь, handoff §10) + ручные корректировки через ledger + журнал начислений. */
export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ discipline?: Discipline; error?: string; tab?: string }> }) {
  const { discipline = 'STREET', error, tab = 'table' } = await searchParams;
  const session = await getSession();
  const admin = hasRole(session, 'SYSTEM_ADMIN');
  const seasons = await apiServer<Season[]>('/admin/seasons').catch(() => [] as Season[]);
  const season = seasons.find((s) => s.isActive) ?? seasons[0];
  const rows = await apiServer<Row[]>(`/rankings?discipline=${discipline}`).catch(() => [] as Row[]);
  const rules = season ? await apiServer<Rules[]>(`/admin/seasons/${season.id}/ranking-rules`).catch(() => [] as Rules[]) : [];
  const current = rules.find((r) => r.discipline === discipline) ?? rules.find((r) => r.discipline === null);
  const ledger = season && tab === 'ledger' ? await apiServer<Ledger[]>(`/admin/seasons/${season.id}/ledger?discipline=${discipline}&limit=200`).catch(() => [] as Ledger[]) : [];

  async function saveRules(fd: FormData) {
    'use server';
    if (!season) return;
    const n = (k: string) => Number(String(fd.get(k) ?? '0').replace(',', '.'));
    try {
      await apiServer(`/admin/seasons/${season.id}/ranking-rules`, { method: 'POST', body: JSON.stringify({
        discipline: String(fd.get('scope')) === 'all' ? null : discipline,
        levelCoefficients: { SPRINT: n('c.SPRINT'), QUALIFIER: n('c.QUALIFIER'), OPEN: n('c.OPEN'), MAJOR: n('c.MAJOR'), GRAND_FINAL: n('c.GRAND_FINAL') },
        disciplineCoefficients: {}, bestResultsCount: String(fd.get('best')) ? n('best') : null, minStartsForFinal: n('minStarts'),
        basePointsByPlace: String(fd.get('points')).split(/[\s,;]+/).filter(Boolean).map(Number), floorPoints: n('floor'),
        tieBreakers: ['BIGGEST_FISH', 'MORE_FISH', 'HEAD_TO_HEAD'], note: String(fd.get('note') ?? ''),
      }) });
    } catch (e) { redirect(`/rankings?discipline=${discipline}&tab=rules&error=${encodeURIComponent(e instanceof ApiError && typeof e.body === 'object' && e.body && 'message' in e.body ? String((e.body as { message: unknown }).message) : 'ошибка')}`); }
    await apiServer(`/admin/seasons/${season.id}/rankings/rebuild`, { method: 'POST' }).catch(() => undefined);
    revalidatePath('/rankings'); redirect(`/rankings?discipline=${discipline}&tab=rules`);
  }
  async function adjust(fd: FormData) {
    'use server';
    if (!season) return;
    try { await apiServer(`/admin/seasons/${season.id}/adjust`, { method: 'POST', body: JSON.stringify({ userId: String(fd.get('userId')), discipline, delta: Number(String(fd.get('delta')).replace(',', '.')), reason: String(fd.get('reason')) }) }); }
    catch (e) { redirect(`/rankings?discipline=${discipline}&tab=ledger&error=${encodeURIComponent(e instanceof ApiError && typeof e.body === 'object' && e.body && 'message' in e.body ? String((e.body as { message: unknown }).message) : 'ошибка')}`); }
    revalidatePath('/rankings'); redirect(`/rankings?discipline=${discipline}&tab=ledger`);
  }
  async function rebuild() {
    'use server';
    if (season) await apiServer(`/admin/seasons/${season.id}/rankings/rebuild`, { method: 'POST' });
    revalidatePath('/rankings'); redirect(`/rankings?discipline=${discipline}`);
  }

  return (
    <>
      <h1>Рейтинг · {season?.title ?? 'сезон'}</h1>
      <div className="toolbar">{Object.values(Discipline).map((d) => <Link key={d} href={`/rankings?discipline=${d}&tab=${tab}`} className={`pill ${d === discipline ? 'ok' : ''}`}>{DISCIPLINE_LABELS_RU[d]}</Link>)}</div>
      <div className="tabs">{[['table', 'таблица'], ['rules', 'правила сезона'], ['ledger', 'журнал начислений и корректировки']].map(([k, l]) => <Link key={k} href={`/rankings?discipline=${discipline}&tab=${k}`} aria-current={tab === k ? 'page' : undefined}>{l}</Link>)}</div>
      {error && <p className="error">{error}</p>}

      {tab === 'table' && (
        <div className="card">
          <div className="toolbar"><span className="muted">{rows.length} спортсменов · правила {current?.version ?? '—'}</span><span style={{ flex: 1 }} />{admin && <form action={rebuild}><button className="btn secondary sm" type="submit">пересобрать из журнала</button></form>}</div>
          <table><thead><tr><th>#</th><th>участник</th><th className="num">стартов</th><th className="num">очки</th></tr></thead><tbody>
            {rows.map((r) => <tr key={r.userId} style={r.rank <= 3 ? { fontWeight: 600 } : undefined}><td>{r.rank}</td><td><Link href={`/users/${r.userId}`}>{r.user.profile?.displayName ?? '—'}</Link></td><td className="num">{r.starts}</td><td className="num">{Number(r.points).toFixed(2)}</td></tr>)}
            {rows.length === 0 && <tr><td colSpan={4} className="muted">начислений нет</td></tr>}
          </tbody></table>
        </div>
      )}

      {tab === 'rules' && (
        <div className="grid2">
          <form action={saveRules} className="card form">
            <h2>Новая версия правил</h2>
            <p className="muted" style={{ margin: 0 }}>Действует с момента сохранения; старые начисления не пересчитываются (ledger неизменяем), проекция пересобирается. Открытый вопрос №1 handoff — Qualifier ×1 или ×1,25 — решается здесь.</p>
            <label>область<select name="scope" className="select" defaultValue={current?.discipline ? 'one' : 'all'}><option value="all">все дисциплины</option><option value="one">только {DISCIPLINE_LABELS_RU[discipline]}</option></select></label>
            <div className="row">
              {(['SPRINT', 'QUALIFIER', 'OPEN', 'MAJOR', 'GRAND_FINAL'] as const).map((l) => <label key={l}>{l.toLowerCase()} ×<input name={`c.${l}`} className="input" defaultValue={current?.payload.levelCoefficients[l] ?? 1} disabled={!admin} /></label>)}
            </div>
            <label>очки за место (через пробел)<input name="points" className="input" defaultValue={(current?.payload.basePointsByPlace ?? []).join(' ')} disabled={!admin} /></label>
            <div className="row">
              <label>очки вне таблицы<input name="floor" className="input" defaultValue={current?.payload.floorPoints ?? 10} disabled={!admin} /></label>
              <label>в зачёт лучших результатов (пусто — все)<input name="best" className="input" defaultValue={current?.payload.bestResultsCount ?? ''} disabled={!admin} /></label>
              <label>минимум стартов для финала<input name="minStarts" className="input" defaultValue={current?.payload.minStartsForFinal ?? 2} disabled={!admin} /></label>
            </div>
            <label>комментарий к версии<input name="note" className="input" placeholder="решение оргкомитета от …" disabled={!admin} /></label>
            {admin ? <div><button className="btn" type="submit">сохранить как новую версию</button></div> : <p className="muted">Менять правила может только системный администратор.</p>}
          </form>
          <div className="card">
            <h2>История версий</h2>
            <table><thead><tr><th>версия</th><th>область</th><th>sprint/qual/open/major/final</th><th>с</th></tr></thead><tbody>
              {rules.map((r) => <tr key={r.id}><td><b>{r.version}</b></td><td>{r.discipline ? DISCIPLINE_LABELS_RU[r.discipline as Discipline] : 'все'}</td><td className="muted">{['SPRINT', 'QUALIFIER', 'OPEN', 'MAJOR', 'GRAND_FINAL'].map((l) => `×${r.payload.levelCoefficients[l]}`).join(' / ')}</td><td className="muted">{dt(r.activeFrom)}</td></tr>)}
            </tbody></table>
          </div>
        </div>
      )}

      {tab === 'ledger' && (
        <div className="grid2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div className="card">
            <h2>Журнал начислений · {DISCIPLINE_LABELS_RU[discipline]}</h2>
            <table><thead><tr><th>когда</th><th>участник</th><th>турнир / причина</th><th>тип</th><th className="num">Δ</th><th>правила</th></tr></thead><tbody>
              {ledger.map((l) => <tr key={l.id}><td className="muted">{dt(l.createdAt)}</td><td><Link href={`/users/${l.userId}`}>{l.user}</Link></td><td>{l.tournament ?? l.reason}</td><td><span className={`pill ${l.type === 'TOURNAMENT_RESULT' ? '' : l.delta < 0 ? 'warn' : 'ok'}`}>{l.type.toLowerCase()}</span></td><td className="num" style={{ color: l.delta < 0 ? 'var(--orange)' : undefined }}>{l.delta > 0 ? '+' : ''}{l.delta}</td><td className="muted">{l.rulesVersion}</td></tr>)}
              {ledger.length === 0 && <tr><td colSpan={6} className="muted">пусто</td></tr>}
            </tbody></table>
          </div>
          <form action={adjust} className="card form" style={{ alignSelf: 'start' }}>
            <h2>Ручная корректировка</h2>
            <p className="muted" style={{ margin: 0 }}>Создаёт запись BONUS/PENALTY с автором и причиной. Ничего не перезаписывает.</p>
            <label>участник<select name="userId" className="select" required>{rows.map((r) => <option key={r.userId} value={r.userId}>{r.user.profile?.displayName ?? r.userId}</option>)}</select></label>
            <label>Δ очков (минус — штраф)<input name="delta" className="input" required placeholder="-20" /></label>
            <label>причина<input name="reason" className="input" required minLength={5} placeholder="решение оргкомитета: нарушение регламента п. 4.2" /></label>
            {admin ? <div><button className="btn" type="submit">записать</button></div> : <p className="muted">Только для системного администратора.</p>}
          </form>
        </div>
      )}
    </>
  );
}
