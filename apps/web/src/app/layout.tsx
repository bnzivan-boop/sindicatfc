import type { Metadata } from 'next';
import Link from 'next/link';
import { logout } from '@/lib/auth';
import { getSession } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = { title: 'Синдикат · CRM', description: 'Кабинет лиги: турниры, участники, судейство, рейтинг, справочники' };

/** CRM лиги (handoff 4.1: организаторы, судьи, модераторы, поддержка). */
const NAV: Array<{ group: string; items: Array<{ href: string; label: string }> }> = [
  { group: 'сезон', items: [{ href: '/', label: 'дашборд' }, { href: '/tournaments', label: 'турниры' }, { href: '/rankings', label: 'рейтинг' }] },
  { group: 'судейство', items: [{ href: '/judging', label: 'очереди и протесты' }] },
  { group: 'люди', items: [{ href: '/users', label: 'пользователи и роли' }, { href: '/community', label: 'сообщество' }] },
  { group: 'система', items: [{ href: '/admin', label: 'сезоны и справочники' }, { href: '/admin/audit', label: 'аудит' }] },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="ru">
      <body>
        <div className="shell">
          <nav className="nav">
            <div className="brand">Синдикат · CRM</div>
            {NAV.map((g) => (
              <div key={g.group}>
                <div className="group">{g.group}</div>
                {g.items.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
              </div>
            ))}
            <div style={{ marginTop: 'auto', fontSize: 12, paddingTop: 16 }}>
              {session ? (
                <form action={logout}>
                  <div className="muted" style={{ marginBottom: 6 }}>{session.phone}<br />{session.roles.map((r) => r.role.toLowerCase()).join(', ')}</div>
                  <button className="btn secondary sm" type="submit">выйти</button>
                </form>
              ) : <Link href="/login" className="btn" style={{ display: 'inline-block' }}>войти</Link>}
            </div>
          </nav>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
