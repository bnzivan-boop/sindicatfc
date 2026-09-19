import { redirect } from 'next/navigation';
import { TournamentForm, parseTournamentForm } from '@/components/TournamentForm';
import { apiServer } from '@/lib/api';
import { getSession, hasRole } from '@/lib/session';

export default async function NewTournamentPage() {
  const session = await getSession();
  if (!hasRole(session, 'ORGANIZER')) redirect('/login');

  async function create(fd: FormData) {
    'use server';
    const dto = parseTournamentForm(fd);
    const created = await apiServer<{ id: string }>('/tournaments', { method: 'POST', body: JSON.stringify(dto) });
    redirect(`/tournaments/${created.id}`);
  }

  return (
    <>
      <h1>Новый турнир</h1>
      <p className="muted">Создаётся черновиком. Дальше — регламент, проверка и публикация через статусы.</p>
      <div style={{ marginTop: 24, maxWidth: 820 }}><TournamentForm action={create} submitLabel="создать черновик" /></div>
    </>
  );
}
