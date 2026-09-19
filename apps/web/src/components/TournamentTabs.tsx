import Link from 'next/link';

const TABS = [['', 'обзор'], ['/participants', 'участники'], ['/results', 'результаты'], ['/protocol', 'протокол'], ['/protests', 'протесты'], ['/markers', 'маркеры'], ['/ops', 'чек-лист и бюджет'], ['/edit', 'карточка и регламент']] as const;

export function TournamentTabs({ id, current }: { id: string; current: string }) {
  return (
    <div className="tabs">
      {TABS.map(([path, label]) => <Link key={path} href={path === '/protests' ? `/judging/${id}/protests` : `/tournaments/${id}${path}`} aria-current={current === path ? 'page' : undefined}>{label}</Link>)}
    </div>
  );
}
