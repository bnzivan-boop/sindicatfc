import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import type { OtpChannel, OtpChannelName } from './channel.js';
import { ConsoleOtpChannel } from './console.channel.js';
import { SmsOtpChannel } from './sms.channel.js';
import { TelegramOtpChannel } from './telegram.channel.js';
import { VkOtpChannel } from './vk.channel.js';

export interface DeliveryResult { channel: OtpChannelName; providerRequestId?: string; /** Каналы, которые ещё можно попробовать вручную («не пришло — отправить SMS»). */ fallbacks: OtpChannelName[] }

/**
 * Каскад доставки кода: идём по OTP_CHANNELS (по умолчанию telegram,vk,sms), первый доставивший побеждает.
 * Клиент может попросить конкретный канал (после «код не пришёл») — тогда начинаем с него.
 */
@Injectable()
export class OtpDeliveryService {
  private readonly logger = new Logger(OtpDeliveryService.name);
  private readonly channels: OtpChannel[];

  constructor(config: ConfigService<Env, true>, telegram: TelegramOtpChannel, vk: VkOtpChannel, sms: SmsOtpChannel, console: ConsoleOtpChannel) {
    const all: Record<OtpChannelName, OtpChannel> = { telegram, vk, sms, console };
    const order = String(config.get('OTP_CHANNELS') ?? 'console').split(',').map((s: string) => s.trim()).filter((s: string): s is OtpChannelName => s in all);
    this.channels = order.map((n) => all[n]).filter((c: OtpChannel) => c.enabled());
    this.logger.log(`Каналы OTP: ${this.channels.map((c) => c.name).join(' → ') || 'нет'}`);
  }

  available(): OtpChannelName[] { return this.channels.map((c) => c.name); }

  async deliver(phone: string, code: string, prefer?: OtpChannelName): Promise<DeliveryResult> {
    const order = prefer ? [...this.channels.filter((c) => c.name === prefer), ...this.channels.filter((c) => c.name !== prefer)] : this.channels;
    const tried: OtpChannelName[] = [];
    for (const ch of order) {
      tried.push(ch.name);
      try {
        if ((await ch.canSend(phone)) === false) { this.logger.debug(`${ch.name}: не может доставить на ${phone}`); continue; }
        const r = await ch.send(phone, code);
        this.logger.log(`OTP → ${phone} через ${ch.name}`);
        return { channel: ch.name, providerRequestId: r.providerRequestId, fallbacks: this.channels.map((c) => c.name).filter((n) => n !== ch.name) };
      } catch (e) {
        this.logger.warn(`${ch.name} не доставил ${phone}: ${e instanceof Error ? e.message : e}`);
      }
    }
    throw new ServiceUnavailableException(`Не удалось отправить код (${tried.join(', ')}). Попробуйте позже.`);
  }
}
