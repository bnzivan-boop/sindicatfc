import { requestOtp, verifyOtp } from '@/lib/auth';

const CHANNEL_LABEL: Record<string, string> = { telegram: 'Telegram', vk: 'ВКонтакте', sms: 'SMS', console: 'консоль (dev)' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ phone?: string; error?: string; channel?: string; fallbacks?: string }> }) {
  const { phone, error, channel, fallbacks } = await searchParams;
  const fallbackList = (fallbacks ?? '').split(',').filter((c) => c && c !== 'console');
  return (
    <div style={{ maxWidth: 420 }}>
      <h1>Вход в кабинет</h1>
      <p className="muted">Организаторы, судьи, администраторы. Код приходит в Telegram, VK или SMS; в dev — в лог API.</p>
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
          <label className="muted">код для {phone}{channel ? ` · отправлен через ${CHANNEL_LABEL[channel] ?? channel}` : ''}</label>
          <input name="code" autoFocus required pattern="[0-9]{4,6}" inputMode="numeric" className="input" />
          <button className="btn" type="submit">войти</button>
        </form>
      )}
      {phone && (
        <form action={requestOtp} style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="hidden" name="phone" value={phone} />
          <span className="muted">код не пришёл?</span>
          <button className="btn ghost" type="submit" name="channel" value="">отправить ещё раз</button>
          {fallbackList.map((c) => (
            <button key={c} className="btn ghost" type="submit" name="channel" value={c}>через {CHANNEL_LABEL[c] ?? c}</button>
          ))}
        </form>
      )}
    </div>
  );
}
