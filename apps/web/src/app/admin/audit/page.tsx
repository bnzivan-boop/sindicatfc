import Link from 'next/link';
import { apiServer } from '@/lib/api';
import { dt } from '@/lib/format';

interface Audit { id: string; actorId: string | null; actorName: string | null; action: string; entityType: string; entityId: string; before: unknown; after: unknown; createdAt: string }

/** Журнал аудита критических действий (handoff §12, §17). */
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const { cursor } = await searchParams;
  const page = await apiServer<{ items: Audit[]; nextCursor: string | null }>(`/admin/audit?limit=100${cursor ? `&cursor=${cursor}` : ''}`).catch(() => ({ items: [] as Audit[], nextCursor: null }));
  const link = (a: Audit) => (a.entityType === 'tournament' ? `/tournaments/${a.entityId}` : a.entityType === 'user' ? `/users/${a.entityId}` : null);
  return (
    <>
      <h1>Аудит</h1>
      <div className="card">
        <table><thead><tr><th>когда</th><th>кто</th><th>действие</th><th>объект</th><th>детали</th></tr></thead><tbody>
          {page.items.map((a) => { const href = link(a); return <tr key={a.id}><td className="muted">{dt(a.createdAt)}</td><td>{a.actorName ?? <span className="muted">система</span>}</td><td><code>{a.action}</code></td><td>{href ? <Link href={href}>{a.entityType} · {a.entityId.slice(0, 8)}</Link> : `${a.entityType} · ${a.entityId.slice(0, 8)}`}</td><td className="muted" style={{ fontSize: 12, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.after ? JSON.stringify(a.after) : a.before ? `← ${JSON.stringify(a.before)}` : ''}</td></tr>; })}
          {page.items.length === 0 && <tr><td colSpan={5} className="muted">нет записей или нет доступа</td></tr>}
        </tbody></table>
        {page.nextCursor && <p><Link href={`/admin/audit?cursor=${page.nextCursor}`} className="btn secondary">дальше →</Link></p>}
      </div>
    </>
  );
}
