import { DISCIPLINE_LABELS_RU, Role } from '@sindikat/domain';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ApiError, apiServer } from '@/lib/api';
import { REG_STATUS_RU, d, dt, money } from '@/lib/format';
import { getSession, hasRole } from '@/lib/session';

interface U { id: string; phone: string; status: string; createdAt: string; lastSeenAt: string | null; profile: { displayName: string; experienceYears: number | null; bio: string | null; onboardingCompletedAt: string | null; city: { name: string } | null } | null; roles: Array<{ id: string; role: string; scopeType: string; scopeId: string | null }>; disciplines: Array<{ discipline: string; priority: number }>; devices: Array<{ platform: string; lastSeenAt: string; hasPush: boolean }>; registrations: Array<{ id: string; status: string; format: string; amountMinor: number | null; tournament: { id: string; title: string; startsAt: string }; payments: Array<{ status: string }> }>; rankings: Array<{ discipline: string; rank: number; points: string; starts: number }>; consents: Array<{ type: string; version: string; acceptedAt: string }>; audit: Array<{ id: string; action: string; entityType: string; createdAt: string }> }
interface T { id: string; title: string; startsAt: string; status: string }

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params; const { error } = await searchParams;
  const session = await getSession();
  const canRoles = hasRole(session, 'SYSTEM_ADMIN', 'SUPPORT');
  const u = await apiServer<U>(`/admin/users/${id}`);
  const tournaments = await apiServer<T[]>('/tournaments/mine/all').catch(() => [] as T[]);

  async function grant(fd: FormData) {
    'use server';
    const scopeId = String(fd.get('scopeId') ?? '');
    try { await apiServer('/admin/roles/grant', { method: 'POST', body: JSON.stringify({ userId: id, role: String(fd.get('role')), scopeType: scopeId ? 'TOURNAMENT' : 'GLOBAL', scopeId: scopeId || undefined }) }); }
    catch (e) { redirect(`/users/${id}?error=${encodeURIComponent(e instanceof ApiError && typeof e.body === 'object' && e.body && 'message' in e.body ? String((e.body as { message: unknown }).message) : 'ошибка')}`); }
    revalidatePath(`/users/${id}`); redirect(`/users/${id}`);
  }
  async function revoke(fd: FormData) { 'use server'; await apiServer(`/admin/roles/${String(fd.get('roleId'))}`, { method: 'DELETE' }).catch(() => undefined); revalidatePath(`/users/${id}`); redirect(`/users/${id}`); }
  async function block(fd: FormData) { 'use server'; await apiServer(`/admin/users/${id}/${String(fd.get('action'))}`, { method: 'POST' }); revalidatePath(`/users/${id}`); redirect(`/users/${id}`); }

  return (
    <>
      <p><Link href="/users" className="muted">← пользователи</Link></p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>{u.profile?.displayName ?? 'Без профиля'}</h1><p className="muted">{u.phone} · {u.profile?.city?.name ?? '—'} · с {d(u.createdAt)} · {u.status === 'BLOCKED' ? <span className="pill warn">заблокирован</span> : <span className="pill ok">активен</span>} · {u.profile?.onboardingCompletedAt ? 'онбординг пройден' : 'онбординг не завершён'}</p></div>
        {canRoles && <form action={block}><button className={`btn ${u.status === 'BLOCKED' ? 'secondary' : 'danger'}`} name="action" value={u.status === 'BLOCKED' ? 'unblock' : 'block'} type="submit">{u.status === 'BLOCKED' ? 'разблокировать' : 'заблокировать'}</button></form>}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="kpis" style={{ marginTop: 16 }}>
        <div className="kpi"><div className="v">{u.registrations.length}</div><div className="l">заявок</div></div>
        <div className="kpi"><div className="v">{money(u.registrations.filter((r) => r.payments[0]?.status === 'SUCCEEDED').reduce((s, r) => s + (r.amountMinor ?? 0), 0))}</div><div className="l">оплачено взносов</div></div>
        <div className="kpi"><div className="v">{u.rankings[0] ? `#${u.rankings[0].rank}` : '—'}</div><div className="l">{u.rankings[0] ? DISCIPLINE_LABELS_RU[u.rankings[0].discipline as keyof typeof DISCIPLINE_LABELS_RU] : 'нет рейтинга'}</div></div>
        <div className="kpi"><div className="v">{u.devices.filter((x) => x.hasPush).length}</div><div className="l">устройств с push</div></div>
      </div>
      <div className="grid2" style={{ marginTop: 20 }}>
        <section className="card">
          <h2>Роли</h2>
          <table><tbody>
            {u.roles.map((r) => <tr key={r.id}><td><span className="pill">{r.role.toLowerCase()}</span></td><td className="muted">{r.scopeType === 'GLOBAL' ? 'глобально' : `турнир ${tournaments.find((t) => t.id === r.scopeId)?.title ?? r.scopeId}`}</td><td>{canRoles && r.role !== 'USER' && <form action={revoke}><input type="hidden" name="roleId" value={r.id} /><button className="btn danger sm" type="submit">отозвать</button></form>}</td></tr>)}
          </tbody></table>
          {canRoles && (
            <form action={grant} className="form" style={{ marginTop: 12 }}>
              <div className="row">
                <label>роль<select name="role" className="select">{Object.values(Role).filter((r) => r !== 'USER').map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}</select></label>
                <label>область<select name="scopeId" className="select"><option value="">глобально</option>{tournaments.filter((t) => !['FINALIZED', 'ARCHIVED', 'CANCELLED'].includes(t.status)).map((t) => <option key={t.id} value={t.id}>{t.title} · {d(t.startsAt)}</option>)}</select></label>
              </div>
              <div><button className="btn" type="submit">выдать роль</button></div>
            </form>
          )}
          <h2 style={{ marginTop: 20 }}>Профиль</h2>
          <p className="muted">дисциплины: {u.disciplines.map((x) => DISCIPLINE_LABELS_RU[x.discipline as keyof typeof DISCIPLINE_LABELS_RU]).join(', ') || '—'} · стаж {u.profile?.experienceYears ?? '—'}</p>
          <p className="muted">согласия: {u.consents.map((c) => `${c.type} v${c.version}`).join(', ') || '—'}</p>
          <p className="muted">устройства: {u.devices.map((x) => `${x.platform}${x.hasPush ? ' (push)' : ''}`).join(', ') || '—'}</p>
        </section>
        <section className="card">
          <h2>Заявки</h2>
          <table><tbody>{u.registrations.map((r) => <tr key={r.id}><td className="muted">{d(r.tournament.startsAt)}</td><td><Link href={`/tournaments/${r.tournament.id}/participants`}>{r.tournament.title}</Link></td><td><span className="pill">{REG_STATUS_RU[r.status]}</span></td><td className="num">{r.payments[0]?.status === 'SUCCEEDED' ? money(r.amountMinor) : ''}</td></tr>)}{u.registrations.length === 0 && <tr><td className="muted">нет</td></tr>}</tbody></table>
          <h2 style={{ marginTop: 20 }}>Рейтинг</h2>
          <table><tbody>{u.rankings.map((r) => <tr key={r.discipline}><td>{DISCIPLINE_LABELS_RU[r.discipline as keyof typeof DISCIPLINE_LABELS_RU]}</td><td>#{r.rank}</td><td className="num">{Number(r.points).toFixed(0)} очков</td><td className="muted">{r.starts} стартов</td></tr>)}</tbody></table>
          <h2 style={{ marginTop: 20 }}>Действия (аудит)</h2>
          {u.audit.map((a) => <p key={a.id} className="muted" style={{ margin: '2px 0' }}>{dt(a.createdAt)} · {a.action} · {a.entityType}</p>)}
        </section>
      </div>
    </>
  );
}
