import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, apiServer } from '@/lib/api';
import { d } from '@/lib/format';
import { getSession, hasRole } from '@/lib/session';

interface Season { id: string; year: number; title: string; startsAt: string; endsAt: string; isActive: boolean; _count: { tournaments: number }; rankingRules: Array<{ version: string }> }
interface Species { id: string; slug: string; nameRu: string; nameLat: string | null; isPredator: boolean; _count: { catches: number; results: number } }
interface GearReq { id: string; type: string; brandText: string; modelText: string; createdAt: string }
interface Brand { id: string; name: string; models: Array<{ id: string; type: string; name: string }> }

/** Системные настройки: сезоны, виды рыб, каталог снастей и очередь нормализации. */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await getSession();
  const admin = hasRole(session, 'SYSTEM_ADMIN');
  const [seasons, species, gearReqs, catalog] = await Promise.all([apiServer<Season[]>('/admin/seasons').catch(() => [] as Season[]), apiServer<Species[]>('/admin/species').catch(() => [] as Species[]), apiServer<GearReq[]>('/admin/gear/custom-requests').catch(() => [] as GearReq[]), apiServer<Brand[]>('/admin/gear/catalog').catch(() => [] as Brand[])]);
  const fail = (e: unknown) => redirect(`/admin?error=${encodeURIComponent(e instanceof ApiError && typeof e.body === 'object' && e.body && 'message' in e.body ? String((e.body as { message: unknown }).message) : 'ошибка')}`);

  async function createSeason(fd: FormData) { 'use server'; const y = Number(fd.get('year')); try { await apiServer('/admin/seasons', { method: 'POST', body: JSON.stringify({ year: y, title: `Сезон ${y}`, startsAt: `${y}-02-01T00:00:00Z`, endsAt: `${y}-11-30T23:59:59Z` }) }); } catch (e) { fail(e); } revalidatePath('/admin'); redirect('/admin'); }
  async function activate(fd: FormData) { 'use server'; await apiServer(`/admin/seasons/${String(fd.get('id'))}/activate`, { method: 'POST' }); revalidatePath('/admin'); redirect('/admin'); }
  async function addSpecies(fd: FormData) { 'use server'; try { await apiServer('/admin/species', { method: 'POST', body: JSON.stringify({ slug: String(fd.get('slug')), nameRu: String(fd.get('nameRu')), nameLat: String(fd.get('nameLat') ?? '') || undefined, isPredator: fd.get('isPredator') === 'on' }) }); } catch (e) { fail(e); } revalidatePath('/admin'); redirect('/admin'); }
  async function approve(fd: FormData) { 'use server'; try { await apiServer(`/admin/gear/custom-requests/${String(fd.get('id'))}/approve`, { method: 'POST', body: JSON.stringify({ brandName: String(fd.get('brand')), modelName: String(fd.get('model')) }) }); } catch (e) { fail(e); } revalidatePath('/admin'); redirect('/admin'); }

  return (
    <>
      <h1>Сезоны и справочники</h1>
      {error && <p className="error">{error}</p>}
      <div className="grid2">
        <section className="card">
          <h2>Сезоны</h2>
          <table><thead><tr><th>сезон</th><th>период</th><th className="num">турниров</th><th>правила</th><th /></tr></thead><tbody>
            {seasons.map((s) => <tr key={s.id}><td><b>{s.title}</b> {s.isActive && <span className="pill ok">активный</span>}</td><td className="muted">{d(s.startsAt)} — {d(s.endsAt)}</td><td className="num">{s._count.tournaments}</td><td className="muted">{s.rankingRules[0]?.version ?? <span className="error">нет</span>}</td><td>{admin && !s.isActive && <form action={activate}><input type="hidden" name="id" value={s.id} /><button className="btn secondary sm">сделать активным</button></form>}</td></tr>)}
          </tbody></table>
          {admin && <form action={createSeason} className="toolbar" style={{ marginTop: 12 }}><input name="year" type="number" className="input" style={{ maxWidth: 120 }} defaultValue={(seasons[0]?.year ?? new Date().getFullYear()) + 1} /><button className="btn secondary" type="submit">создать сезон</button><span className="muted">февраль–ноябрь; правила рейтинга задать на странице «рейтинг»</span></form>}
        </section>
        <section className="card">
          <h2>Виды рыб</h2>
          <table><thead><tr><th>вид</th><th>лат.</th><th>хищник</th><th className="num">уловов / результатов</th></tr></thead><tbody>
            {species.map((s) => <tr key={s.id}><td>{s.nameRu} <span className="muted">{s.slug}</span></td><td className="muted">{s.nameLat ?? ''}</td><td>{s.isPredator ? 'да' : ''}</td><td className="num">{s._count.catches} / {s._count.results}</td></tr>)}
          </tbody></table>
          {admin && <form action={addSpecies} className="toolbar" style={{ marginTop: 12 }}><input name="slug" placeholder="slug (asp)" className="input" style={{ maxWidth: 110 }} required /><input name="nameRu" placeholder="Жерех" className="input" style={{ maxWidth: 140 }} required /><input name="nameLat" placeholder="Aspius aspius" className="input" style={{ maxWidth: 160 }} /><label className="check"><input type="checkbox" name="isPredator" />хищник</label><button className="btn secondary" type="submit">добавить</button></form>}
        </section>
      </div>
      <div className="grid2" style={{ marginTop: 16 }}>
        <section className="card">
          <h2>Снасти на нормализацию · {gearReqs.length}</h2>
          <p className="muted">Модели, введённые участниками вручную. Утверждение добавляет бренд и модель в каталог для автоподсказок.</p>
          {gearReqs.map((r) => <form key={r.id} action={approve} className="toolbar"><input type="hidden" name="id" value={r.id} /><span className="pill">{r.type.toLowerCase()}</span><input name="brand" className="input" defaultValue={r.brandText} style={{ maxWidth: 150 }} required /><input name="model" className="input" defaultValue={r.modelText} style={{ maxWidth: 200 }} required /><button className="btn sm" type="submit">в каталог</button></form>)}
          {gearReqs.length === 0 && <p className="muted">очередь пуста</p>}
        </section>
        <section className="card">
          <h2>Каталог снастей</h2>
          {catalog.map((b) => <p key={b.id} style={{ margin: '4px 0' }}><b>{b.name}</b> <span className="muted">{b.models.map((m) => `${m.name} (${m.type.toLowerCase()})`).join(', ')}</span></p>)}
          {catalog.length === 0 && <p className="muted">пусто</p>}
        </section>
      </div>
    </>
  );
}
