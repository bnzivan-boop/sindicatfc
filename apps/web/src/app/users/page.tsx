import { Role } from '@sindikat/domain';
import Link from 'next/link';
import { apiServer } from '@/lib/api';
import { d } from '@/lib/format';

interface U { id: string; phone: string; status: string; displayName: string | null; city: string | null; roles: Array<{ role: string; scopeType: string; scopeId: string | null }>; registrations: number; createdAt: string; lastSeenAt: string | null }

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const { q = '', role } = await searchParams;
  const users = await apiServer<U[]>(`/admin/users?limit=100${q ? `&q=${encodeURIComponent(q)}` : ''}${role ? `&role=${role}` : ''}`).catch(() => [] as U[]);
  return (
    <>
      <h1>Пользователи и роли</h1>
      <form className="toolbar" method="get">
        <input name="q" defaultValue={q} placeholder="имя или телефон" className="input" style={{ maxWidth: 260 }} />
        <select name="role" defaultValue={role ?? ''} className="select" style={{ maxWidth: 200 }}><option value="">любая роль</option>{Object.values(Role).map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}</select>
        <button className="btn secondary" type="submit">найти</button>
        <span className="muted">{users.length} показано</span>
      </form>
      <div className="card">
        <table><thead><tr><th>участник</th><th>телефон</th><th>город</th><th>роли</th><th className="num">заявок</th><th>регистрация</th><th>статус</th></tr></thead><tbody>
          {users.map((u) => <tr key={u.id}><td><Link href={`/users/${u.id}`}>{u.displayName ?? <span className="muted">без профиля</span>}</Link></td><td className="muted">{u.phone}</td><td>{u.city ?? '—'}</td><td>{u.roles.filter((r) => r.role !== 'USER').map((r, i) => <span key={i} className="pill" style={{ marginRight: 4 }}>{r.role.toLowerCase()}{r.scopeType !== 'GLOBAL' ? ' ·турнир' : ''}</span>)}</td><td className="num">{u.registrations}</td><td className="muted">{d(u.createdAt)}</td><td>{u.status === 'BLOCKED' ? <span className="pill warn">заблокирован</span> : <span className="pill ok">активен</span>}</td></tr>)}
        </tbody></table>
      </div>
    </>
  );
}
