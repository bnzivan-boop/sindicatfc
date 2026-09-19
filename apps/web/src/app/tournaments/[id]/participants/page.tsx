import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TournamentTabs } from '@/components/TournamentTabs';
import { ApiError, apiServer } from '@/lib/api';
import { FORMAT_RU, REG_STATUS_RU, d, money } from '@/lib/format';
import { getTournament } from '@/lib/tournament';

interface Reg { id: string; status: string; format: string; startNumber: string | null; amountMinor: number | null; createdAt: string; owner: { id: string; profile: { displayName: string } | null; phone: string }; members: Array<{ role: string; invitationStatus: string; user: { id: string; profile: { displayName: string } | null } | null }>; payments?: Array<{ status: string; paidAt: string | null }> }
interface Wait { id: string; userId: string; displayName: string; position: number; createdAt: string }

export default async function ParticipantsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; status?: string }> }) {
  const { id } = await params;
  const { error, status } = await searchParams;
  const t = await getTournament(id);
  const [regs, waitlist] = await Promise.all([apiServer<Reg[]>(`/tournaments/${id}/registrations`).catch(() => [] as Reg[]), apiServer<Wait[]>(`/tournaments/${id}/waitlist`).catch(() => [] as Wait[])]);
  const rows = status ? regs.filter((r) => r.status === status) : regs;
  const paidMinor = regs.reduce((s, r) => s + (r.payments?.[0]?.status === 'SUCCEEDED' ? (r.amountMinor ?? 0) : 0), 0);
  const csv = ['номер;участник;телефон;формат;статус;оплата;подана', ...regs.map((r) => [r.startNumber ?? '', r.owner.profile?.displayName ?? '', r.owner.phone, FORMAT_RU[r.format], REG_STATUS_RU[r.status], r.payments?.[0]?.status === 'SUCCEEDED' ? 'да' : 'нет', d(r.createdAt)].join(';'))].join('\n');

  async function action(fd: FormData) {
    'use server';
    const a = String(fd.get('action')); const regId = String(fd.get('regId') ?? '');
    try {
      if (a === 'start-numbers') await apiServer(`/tournaments/${id}/start-numbers`, { method: 'POST' });
      if (a === 'check-in') await apiServer(`/tournaments/${id}/registrations/${regId}/check-in`, { method: 'POST' });
      if (a === 'reject') await apiServer(`/tournaments/${id}/registrations/${regId}/reject`, { method: 'POST', body: JSON.stringify({ reason: String(fd.get('reason') ?? '') || undefined }) });
    } catch (e) { redirect(`/tournaments/${id}/participants?error=${encodeURIComponent(e instanceof ApiError && typeof e.body === 'object' && e.body && 'message' in e.body ? String((e.body as { message: unknown }).message) : 'ошибка')}`); }
    revalidatePath(`/tournaments/${id}/participants`); redirect(`/tournaments/${id}/participants`);
  }

  return (
    <>
      <h1>{t.title}</h1>
      <TournamentTabs id={id} current="/participants" />
      {error && <p className="error">{error}</p>}
      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="v">{regs.filter((r) => ['CONFIRMED', 'CHECKED_IN', 'FINISHED'].includes(r.status)).length} / {t.capacity}</div><div className="l">подтверждено</div></div>
        <div className="kpi"><div className="v">{regs.filter((r) => r.status === 'CHECKED_IN').length}</div><div className="l">на старте (чек-ин)</div></div>
        <div className="kpi"><div className="v">{regs.filter((r) => ['WAITING_PAYMENT', 'WAITING_MEMBERS'].includes(r.status)).length}</div><div className="l">в работе</div></div>
        <div className="kpi"><div className="v">{money(paidMinor)}</div><div className="l">собрано взносов</div></div>
        <div className="kpi"><div className="v">{waitlist.length}</div><div className="l">лист ожидания</div></div>
      </div>
      <div className="toolbar">
        {['', 'CONFIRMED', 'CHECKED_IN', 'WAITING_PAYMENT', 'WAITING_MEMBERS', 'CANCELLED', 'REJECTED'].map((s) => <Link key={s} href={`/tournaments/${id}/participants${s ? `?status=${s}` : ''}`} className={`pill ${status === s || (!status && !s) ? 'ok' : ''}`}>{s ? REG_STATUS_RU[s] : 'все'}</Link>)}
        <span style={{ flex: 1 }} />
        {['REGISTRATION_CLOSED', 'LIVE'].includes(t.status) && <form action={action}><button className="btn" name="action" value="start-numbers" type="submit">выдать стартовые номера</button></form>}
        <a className="btn secondary" href={`data:text/csv;charset=utf-8,﻿${encodeURIComponent(csv)}`} download={`${t.title}-участники.csv`}>CSV</a>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>участник</th><th>телефон</th><th>формат</th><th>статус</th><th>оплата</th><th>подана</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.startNumber ?? '—'}</b></td>
                <td><Link href={`/users/${r.owner.id}`}>{r.owner.profile?.displayName ?? r.owner.phone}</Link>{r.members.filter((m) => m.role !== 'OWNER').map((m, i) => <span key={i} className="muted"> + {m.user?.profile?.displayName ?? 'приглашён'}{m.invitationStatus !== 'ACCEPTED' ? ' (?)' : ''}</span>)}</td>
                <td className="muted">{r.owner.phone}</td>
                <td>{FORMAT_RU[r.format]}</td>
                <td><span className={`pill ${r.status === 'CHECKED_IN' ? 'ok' : ['CANCELLED', 'REJECTED', 'REFUNDED'].includes(r.status) ? 'dim' : ''}`}>{REG_STATUS_RU[r.status]}</span></td>
                <td>{r.payments?.[0]?.status === 'SUCCEEDED' ? money(r.amountMinor) : r.amountMinor ? <span className="error">нет</span> : '—'}</td>
                <td className="muted">{d(r.createdAt)}</td>
                <td className="row-actions" style={{ whiteSpace: 'nowrap' }}>
                  {r.status === 'CONFIRMED' && <form action={action}><input type="hidden" name="regId" value={r.id} /><button className="btn sm" name="action" value="check-in">чек-ин</button></form>}
                  {['WAITING_PAYMENT', 'WAITING_MEMBERS', 'CONFIRMED', 'WAITLISTED'].includes(r.status) && <form action={action}><input type="hidden" name="regId" value={r.id} /><button className="btn danger sm" name="action" value="reject">отклонить</button></form>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="muted">заявок нет</td></tr>}
          </tbody>
        </table>
      </div>
      {waitlist.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Лист ожидания</h2>
          <table><tbody>{waitlist.map((w) => <tr key={w.id}><td>{w.position}</td><td><Link href={`/users/${w.userId}`}>{w.displayName}</Link></td><td className="muted">{d(w.createdAt)}</td></tr>)}</tbody></table>
        </div>
      )}
    </>
  );
}
