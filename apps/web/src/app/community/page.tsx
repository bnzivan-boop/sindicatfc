import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import { dt } from '@/lib/format';

interface P { id: string; title: string; channel: string; author: string; createdAt: string; deletedAt: string | null; likes: number; comments: number }
interface C { id: string; name: string; kind: string; members: number; posts: number }

/** Модерация сообщества: каналы и последние публикации; скрытие поста (soft-delete). */
export default async function CommunityAdmin() {
  const [posts, channels] = await Promise.all([apiServer<P[]>('/admin/community/posts').catch(() => [] as P[]), apiServer<C[]>('/community/channels').catch(() => [] as C[])]);
  async function remove(fd: FormData) { 'use server'; await apiServer(`/community/posts/${String(fd.get('id'))}`, { method: 'DELETE' }); revalidatePath('/community'); }
  return (
    <>
      <h1>Сообщество</h1>
      <div className="kpis" style={{ marginBottom: 16 }}>{channels.map((c) => <div key={c.id} className={`kpi ${c.kind === 'OFFICIAL' ? 'accent' : ''}`}><div className="v">{c.members}</div><div className="l">{c.name} · {c.posts} публикаций</div></div>)}</div>
      <div className="card">
        <h2>Последние публикации</h2>
        <table><thead><tr><th>когда</th><th>канал</th><th>автор</th><th>заголовок</th><th className="num">❤ / 💬</th><th /></tr></thead><tbody>
          {posts.map((p) => <tr key={p.id} style={p.deletedAt ? { opacity: 0.5 } : undefined}><td className="muted">{dt(p.createdAt)}</td><td>{p.channel}</td><td>{p.author}</td><td>{p.title}{p.deletedAt && <span className="pill dim" style={{ marginLeft: 6 }}>скрыт</span>}</td><td className="num">{p.likes} / {p.comments}</td><td>{!p.deletedAt && <form action={remove}><input type="hidden" name="id" value={p.id} /><button className="btn danger sm" type="submit">скрыть</button></form>}</td></tr>)}
        </tbody></table>
      </div>
    </>
  );
}
