import { requestOtp, verifyOtp } from '@/lib/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ phone?: string; error?: string }> }) {
  const { phone, error } = await searchParams;
  return (
    <div style={{ maxWidth: 420 }}>
      <h1>Вход в кабинет</h1>
      <p className="muted">Организаторы, судьи, администраторы. Код приходит по SMS; в dev — в лог API.</p>
      {error && <p style={{ color: 'var(--orange)' }}>{error}</p>}
      {!phone ? (
        <form action={requestOtp} className="card" style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <label className="muted">телефон</label>
          <input name="phone" defaultValue="+7" required pattern="\+[1-9][0-9]{6,14}" className="input" />
          <button className="btn" type="submit">получить код</button>
        </form>
      ) : (
        <form action={verifyOtp} className="card" style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <input type="hidden" name="phone" value={phone} />
          <label className="muted">код для {phone}</label>
          <input name="code" autoFocus required pattern="[0-9]{4,6}" inputMode="numeric" className="input" />
          <button className="btn" type="submit">войти</button>
        </form>
      )}
    </div>
  );
}
