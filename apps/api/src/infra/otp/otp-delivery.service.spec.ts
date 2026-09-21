import { describe, expect, it } from 'vitest';
import type { OtpChannel, OtpChannelName } from './channel.js';
import { OtpDeliveryService } from './otp-delivery.service.js';

/** Каскад: telegram → vk → sms; неудача/невозможность доставки одного канала передаёт ход следующему. */
function fake(name: OtpChannelName, opts: { enabled?: boolean; can?: boolean | undefined; fail?: boolean } = {}): OtpChannel & { sent: string[] } {
  return {
    name,
    sent: [],
    enabled: () => opts.enabled ?? true,
    canSend: async () => opts.can,
    async send(phone) { if (opts.fail) throw new Error('down'); this.sent.push(phone); return { providerRequestId: `${name}-1` }; },
  };
}
const config = (channels: string) => ({ get: (k: string) => (k === 'OTP_CHANNELS' ? channels : undefined) }) as never;
const build = (tg: OtpChannel, vk: OtpChannel, sms: OtpChannel, order = 'telegram,vk,sms') =>
  new OtpDeliveryService(config(order), tg as never, vk as never, sms as never, fake('console') as never);

describe('OtpDeliveryService', () => {
  it('сначала Telegram, если номер там есть', async () => {
    const tg = fake('telegram', { can: true }), vk = fake('vk'), sms = fake('sms');
    const r = await build(tg, vk, sms).deliver('+79990000001', '123456');
    expect(r.channel).toBe('telegram');
    expect(r.fallbacks).toEqual(['vk', 'sms']);
    expect(vk.sent).toHaveLength(0);
  });

  it('Telegram не может доставить → VK', async () => {
    const tg = fake('telegram', { can: false }), vk = fake('vk'), sms = fake('sms');
    expect((await build(tg, vk, sms).deliver('+7', '1')).channel).toBe('vk');
    expect(tg.sent).toHaveLength(0);
  });

  it('VK упал → SMS как последний рубеж', async () => {
    const tg = fake('telegram', { can: false }), vk = fake('vk', { fail: true }), sms = fake('sms');
    expect((await build(tg, vk, sms).deliver('+7', '1')).channel).toBe('sms');
  });

  it('ненастроенные каналы пропускаются; prefer ставит канал первым', async () => {
    const tg = fake('telegram', { enabled: false }), vk = fake('vk'), sms = fake('sms');
    const svc = build(tg, vk, sms);
    expect(svc.available()).toEqual(['vk', 'sms']);
    expect((await svc.deliver('+7', '1', 'sms')).channel).toBe('sms');
  });

  it('все каналы упали → 503', async () => {
    const svc = build(fake('telegram', { fail: true }), fake('vk', { fail: true }), fake('sms', { fail: true }));
    await expect(svc.deliver('+7', '1')).rejects.toThrow(/Не удалось отправить код/);
  });
});
