import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { OtpChannelError, type OtpChannel } from './channel.js';

/**
 * SMS — запасной канал. Провайдер абстрагирован: любой HTTP API с параметрами to/text
 * (SMS.ru, SMSC, Twilio через шлюз). Шаблон запроса — в конфигурации.
 * Пример для SMS.ru: SMS_URL=https://sms.ru/sms/send, SMS_API_KEY=…, SMS_SENDER=Sindikat
 */
@Injectable()
export class SmsOtpChannel implements OtpChannel {
  readonly name = 'sms' as const;

  constructor(private readonly config: ConfigService<Env, true>) {}

  enabled() { return !!this.config.get('SMS_URL') && !!this.config.get('SMS_API_KEY'); }

  async canSend() { return undefined; }

  async send(phone: string, code: string) {
    const params = new URLSearchParams({ api_id: this.config.get('SMS_API_KEY')!, to: phone.replace('+', ''), msg: `Синдикат: код ${code}. Никому не сообщайте.`, json: '1', ...(this.config.get('SMS_SENDER') ? { from: this.config.get('SMS_SENDER')! } : {}) });
    const res = await fetch(`${this.config.get('SMS_URL')}?${params}`, { signal: AbortSignal.timeout(8000) });
    const json = (await res.json().catch(() => ({}))) as { status?: string; status_text?: string; sms?: Record<string, { status: string; sms_id?: string; status_text?: string }> };
    const first = json.sms ? Object.values(json.sms)[0] : undefined;
    if (json.status !== 'OK' || (first && first.status !== 'OK')) throw new OtpChannelError('sms', first?.status_text ?? json.status_text ?? `HTTP ${res.status}`);
    return { providerRequestId: first?.sms_id };
  }
}
