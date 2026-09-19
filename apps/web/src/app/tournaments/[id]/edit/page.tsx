import { redirect } from 'next/navigation';
import type { UpsertTournament } from '@sindikat/domain';
import { revalidatePath } from 'next/cache';
import { RulesForm, parseRulesForm } from '@/components/RulesForm';
import { TournamentForm, parseTournamentForm } from '@/components/TournamentForm';
import { TournamentTabs } from '@/components/TournamentTabs';
import { apiServer } from '@/lib/api';
import { getSession, hasRole } from '@/lib/session';

type Detail = UpsertTournament & { id: string; rules: Array<{ version: number; allowedTackle: string[]; forbiddenTackle: string[]; scoringSummary: string; fixationSummary: string; penalties: string[]; scoringParams: { fishCount?: number; maxPerSpecies?: number | null } }> };

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!hasRole(session, 'ORGANIZER')) redirect('/login');
  const { id } = await params;
  const t = await apiServer<Detail>(`/tournaments/${id}`);
  const rules = t.rules[0];

  async function save(fd: FormData) {
    'use server';
    await apiServer(`/tournaments/${id}`, { method: 'PATCH', body: JSON.stringify(parseTournamentForm(fd)) });
    revalidatePath(`/tournaments/${id}`);
    redirect(`/tournaments/${id}`);
  }
  async function applyTemplate() {
    'use server';
    await apiServer(`/tournaments/${id}/rules/template`, { method: 'POST', body: JSON.stringify({}) });
    revalidatePath(`/tournaments/${id}`); redirect(`/tournaments/${id}`);
  }
  async function saveRules(fd: FormData) {
    'use server';
    await apiServer(`/tournaments/${id}/rules`, { method: 'POST', body: JSON.stringify(parseRulesForm(fd)) });
    revalidatePath(`/tournaments/${id}`);
    redirect(`/tournaments/${id}`);
  }

  return (
    <>
      <h1>{t.title}</h1>
      <TournamentTabs id={id} current="/edit" />
      <div style={{ maxWidth: 820, display: 'grid', gap: 24 }}>
        <TournamentForm initial={t} action={save} submitLabel="сохранить" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Регламент</h2>
          <form action={applyTemplate}><button className="btn secondary" type="submit">применить шаблон дисциплины</button></form>
        </div>
        <RulesForm initial={rules ? { ...rules, scoringParams: rules.scoringParams ?? {} } : undefined} action={saveRules} />
      </div>
    </>
  );
}
