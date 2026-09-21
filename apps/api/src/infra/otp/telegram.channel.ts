import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { OtpChannelError, type OtpChannel } from './channel.js';

/**
 * Telegram Gateway (https://core.telegram.org/gateway/api): официальный сервис отправки кодов
 * в Telegram по номеру телефона. Дешевле SMS, доходит только если номер привязан к Telegram —
 * поэтому сначала checkSendAbility, чтобы не тратить попытку впустую.
 */
@Injectable()
export class TelegramOtpChannel implements OtpChannel {
  readonly name = 'telegram' as const;
  private readonly logger = new Logger(TelegramOtpChannel.name);
  private readonly base = 'https://gatewayapi.telegram.org';
  /** request_id из checkSendAbility: передаётся в sendVerificationMessage — иначе FLOOD_WAIT и двойная тарификация */
  private readonly pending = new Map<string, { requestId: string; at: number }>();

  constructor(private readonly config: ConfigService<Env, true>) {}

  enabled() { return !!this.config.get('TELEGRAM_GATEWAY_TOKEN'); }

  private async call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.base}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.get('TELEGRAM_GATEWAY_TOKEN')}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });
    const json = (await res.json()) as { ok: boolean; result?: T; error?: string };
    if (!json.ok) throw new OtpChannelError('telegram', json.error ?? `HTTP ${res.status}`);
    return json.result as T;
  }

  async canSend(phone: string) {
    try {
      // Успех = у номера есть Telegram и лимиты позволяют; request_id переиспользуем в send
      const r = await this.call<{ request_id: string }>('checkSendAbility', { phone_number: phone });
      this.pending.set(phone, { requestId: r.request_id, at: Date.now() });
      return true;
    } catch (e) {
      this.logger.debug(`checkSendAbility ${phone}: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }

  async send(phone: string, code: string) {
    const prev = this.pending.get(phone);
    this.pending.delete(phone);
    const r = await this.call<{ request_id: string }>('sendVerificationMessage', {
      phone_number: phone,
      code,
      ttl: 300,
      sender_username: this.config.get('TELEGRAM_GATEWAY_SENDER') || undefined,
      // request_id от проверки живёт недолго; берём только свежий
      request_id: prev && Date.now() - prev.at < 60_000 ? prev.requestId : undefined,
    });
    return { providerRequestId: r.request_id };
  }
}
