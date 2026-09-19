import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TournamentTabs } from '@/components/TournamentTabs';
import { apiServer } from '@/lib/api';
import { money } from '@/lib/format';
import { getTournament } from '@/lib/tournament';

interface Ops { checklist: Array<{ key: string; title: string; note?: string; status: 'DONE' | 'TODO' | 'NA' }>; budget: Array<{ title: string; amountMinor: number; kind: 'INCOME' | 'EXPENSE' }>; partners: Array<{ title: string; description?: string; priceMinor: number | null; status: 'OFFERED' | 'CONFIRMED' | 'DECLINED' }>; prizeFundMinor: number | null; notes: string | null }

/** organizer-view прототипа: допуски (юридический чек-лист), бюджет, партнёрские пакеты. Сохраняется целиком одной формой. */
export default async function OpsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTournament(id);
  const ops = await apiServer<Ops>(`/tournaments/${id}/ops`);
  const regsCount = await apiServer<Array<{ status: string; amountMinor: number | null; payments?: Array<{ status: string }> }>>(`/tournaments/${id}/registrations`).then((r) => r.filter((x) => x.payments?.[0]?.status === 'SUCCEEDED').reduce((s, x) => s + (x.amountMinor ?? 0), 0)).catch(() => 0);
  const income = ops.budget.filter((b) => b.kind === 'INCOME').reduce((s, b) => s + b.amountMinor, 0) + regsCount;
  const expense = ops.budget.filter((b) => b.kind === 'EXPENSE').reduce((s, b) => s + b.amountMinor, 0);
  const done = ops.checklist.filter((c) => c.status === 'DONE').length;
  const total = ops.checklist.filter((c) => c.status !== 'NA').length;

  async function save(fd: FormData) {
    'use server';
    const lines = (k: string) => String(fd.get(k) ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
    const parseMoneyLine = (l: string) => { const m = l.match(/^(.*?)[\s;:]+(-?[\d\s]+)\s*₽?$/); return m ? { title: m[1]!.trim(), amountMinor: Math.round(Number(m[2]!.replace(/\s/g, '')) * 100) } : null; };
    const checklist = ops.checklist.map((c) => ({ key: c.key, title: String(fd.get(`title.${c.key}`) ?? c.title), note: String(fd.get(`note.${c.key}`) ?? ''), status: String(fd.get(`status.${c.key}`) ?? c.status) as Ops['checklist'][number]['status'] }));
    const extra = lines('newChecks').map((title, i) => ({ key: `custom-${Date.now()}-${i}`, title, note: '', status: 'TODO' as const }));
    const budget = [...lines('income').map(parseMoneyLine).filter(Boolean).map((x) => ({ ...x!, kind: 'INCOME' as const })), ...lines('expense').map(parseMoneyLine).filter(Boolean).map((x) => ({ ...x!, amountMinor: Math.abs(x!.amountMinor), kind: 'EXPENSE' as const }))];
    const partners = lines('partners').map((l) => { const [title, price, status] = l.split(';').map((s) => s.trim()); return { title: title ?? l, priceMinor: price && /^\d/.test(price) ? Math.round(Number(price.replace(/\s/g, '')) * 100) : null, status: (['CONFIRMED', 'DECLINED'].includes(status ?? '') ? status : 'OFFERED') as Ops['partners'][number]['status'] }; });
    const prize = String(fd.get('prize') ?? '').replace(/\s/g, '');
    await apiServer(`/tournaments/${id}/ops`, { method: 'PUT', body: JSON.stringify({ checklist: [...checklist, ...extra], budget, partners, prizeFundMinor: prize ? Math.round(Number(prize) * 100) : null, notes: String(fd.get('notes') ?? '') || null }) });
    revalidatePath(`/tournaments/${id}/ops`); redirect(`/tournaments/${id}/ops`);
  }
  const moneyLines = (kind: 'INCOME' | 'EXPENSE') => ops.budget.filter((b) => b.kind === kind).map((b) => `${b.title}; ${b.amountMinor / 100}`).join('\n');

  return (
    <>
      <h1>{t.title}</h1>
      <TournamentTabs id={id} current="/ops" />
      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi accent"><div className="v">{done} / {total}</div><div className="l">чек-лист допусков</div></div>
        <div className="kpi"><div className="v">{money(income)}</div><div className="l">доходы · включая взносы {money(regsCount)}</div></div>
        <div className="kpi"><div className="v">{money(expense)}</div><div className="l">расходы</div></div>
        <div className="kpi" style={income - expense < (ops.prizeFundMinor ?? 0) ? { borderColor: 'var(--orange)' } : undefined}><div className="v">{money(income - expense)}</div><div className="l">остаток · призовой {money(ops.prizeFundMinor)}</div></div>
      </div>
      <form action={save} className="grid2">
        <section className="card form">
          <h2>Юридический чек-лист</h2>
          <table><tbody>
            {ops.checklist.map((c) => (
              <tr key={c.key}>
                <td style={{ width: 130 }}><select name={`status.${c.key}`} defaultValue={c.status} className="select"><option value="TODO">открыто</option><option value="DONE">готово</option><option value="NA">не требуется</option></select></td>
                <td><input name={`title.${c.key}`} defaultValue={c.title} className="input" /><input name={`note.${c.key}`} defaultValue={c.note ?? ''} placeholder="заметка: номер письма, подрядчик, дата" className="input" style={{ marginTop: 4, fontSize: 12 }} /></td>
              </tr>
            ))}
          </tbody></table>
          <label>добавить пункты (по строке)<textarea name="newChecks" className="textarea" placeholder="разрешение на использование причала" /></label>
          <label>заметки организатора<textarea name="notes" className="textarea" defaultValue={ops.notes ?? ''} /></label>
        </section>
        <section className="card form">
          <h2>Экономика этапа</h2>
          <p className="muted" style={{ margin: 0 }}>По строке: <code>название; сумма в ₽</code>. Взносы участников считаются автоматически из оплат.</p>
          <label>доходы<textarea name="income" className="textarea" defaultValue={moneyLines('INCOME')} placeholder={'партнёрские пакеты; 180000'} /></label>
          <label>расходы<textarea name="expense" className="textarea" defaultValue={moneyLines('EXPENSE')} placeholder={'площадка и штаб; 72000\nсудьи и безопасность; 86000\nмедиа и награждение; 64000'} /></label>
          <label>призовой фонд, ₽<input name="prize" className="input" defaultValue={ops.prizeFundMinor ? ops.prizeFundMinor / 100 : ''} /></label>
          <h2 style={{ marginTop: 8 }}>Партнёрские пакеты</h2>
          <p className="muted" style={{ margin: 0 }}>По строке: <code>пакет; цена ₽ или «товар»; CONFIRMED / OFFERED / DECLINED</code></p>
          <textarea name="partners" className="textarea" defaultValue={ops.partners.map((p) => `${p.title}; ${p.priceMinor ? p.priceMinor / 100 : 'товар'}; ${p.status}`).join('\n')} placeholder={'титульный партнёр; 120000; OFFERED\nпартнёр зоны; 40000; CONFIRMED\nпризовой партнёр; товар; OFFERED'} />
          <div><button className="btn" type="submit">сохранить всё</button></div>
        </section>
      </form>
    </>
  );
}
