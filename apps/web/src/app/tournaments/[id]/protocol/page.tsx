import Link from 'next/link';
import { TournamentTabs } from '@/components/TournamentTabs';
import { apiServer } from '@/lib/api';
import { dt } from '@/lib/format';
import { getTournament } from '@/lib/tournament';

interface LB { version: number; isFinal: boolean; entries: Array<{ place: number; participantId: string; displayName: string; score: number; countedFish: number; biggestFishMm: number | null; updatedAt: string }> }

/** Протокол / live-таблица: снапшот лидерборда; финальный — неизменяемый (handoff §7.1). */
export default async function ProtocolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTournament(id);
  const lb = await apiServer<LB>(`/tournaments/${id}/leaderboard`);
  const score = (v: number) => (t.scoringMode === 'LENGTH_SUM' ? `${(v / 10).toFixed(1)} см` : t.scoringMode === 'TOTAL_WEIGHT' ? `${(v / 1000).toFixed(2)} кг` : t.scoringMode === 'PLACE_SUM' ? `${v} (сумма мест)` : `${v} очк.`);
  const csv = ['место;участник;результат;рыб;big fish', ...lb.entries.map((e) => [e.place, e.displayName, score(e.score), e.countedFish, e.biggestFishMm ? `${e.biggestFishMm / 10} см` : ''].join(';'))].join('\n');
  return (
    <>
      <h1>{t.title}</h1>
      <TournamentTabs id={id} current="/protocol" />
      <div className="toolbar">
        <span className={`pill ${lb.isFinal ? 'ok' : 'warn'}`}>{lb.isFinal ? `финальный протокол · v${lb.version}` : lb.version ? `live · v${lb.version}` : 'ещё нет результатов'}</span>
        {lb.entries[0] && <span className="muted">обновлён {dt(lb.entries[0].updatedAt)}</span>}
        <span style={{ flex: 1 }} />
        <a className="btn secondary" href={`data:text/csv;charset=utf-8,﻿${encodeURIComponent(csv)}`} download={`${t.title}-протокол.csv`}>CSV</a>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>место</th><th>участник</th><th className="num">результат</th><th className="num">рыб в зачёте</th><th className="num">big fish</th></tr></thead>
          <tbody>
            {lb.entries.map((e) => <tr key={e.participantId} style={e.place <= 3 ? { fontWeight: 600 } : undefined}><td>{e.place}</td><td><Link href={`/users/${e.participantId}`}>{e.displayName}</Link></td><td className="num">{score(e.score)}</td><td className="num">{e.countedFish}</td><td className="num">{e.biggestFishMm ? `${e.biggestFishMm / 10} см` : '—'}</td></tr>)}
            {lb.entries.length === 0 && <tr><td colSpan={5} className="muted">пусто</td></tr>}
          </tbody>
        </table>
      </div>
      {!lb.isFinal && t.status === 'JUDGING' && <p className="muted" style={{ marginTop: 12 }}>Протокол станет финальным после перехода турнира в «финализирован» (<Link href={`/tournaments/${id}`}>обзор</Link>).</p>}
    </>
  );
}
