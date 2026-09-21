import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { OtpChannelError, type OtpChannel } from './channel.js';

/**
 * VK ID — верификация номера сообщением ВКонтакте (id.vk.com, «Проверка номера телефона»).
 * Точные endpoint и формат зависят от подключённого в кабинете VK ID сервиса, поэтому URL
 * и тело запроса — в конфигурации (VK_OTP_URL, VK_OTP_TOKEN); ниже — контракт по умолчанию.
 * TODO(интеграция): сверить с актуальной документацией VK ID при получении доступа.
 */
@Injectable()
export class VkOtpChannel implements OtpChannel {
  readonly name = 'vk' as const;

  constructor(private readonly config: ConfigService<Env, true>) {}

  enabled() { return !!this.config.get('VK_OTP_TOKEN') && !!this.config.get('VK_OTP_URL'); }

  async canSend() { return undefined; } // VK не даёт предпроверки — пробуем отправить

  async send(phone: string, code: string) {
    const res = await fetch(this.config.get('VK_OTP_URL')!, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.get('VK_OTP_TOKEN')}` },
      body: JSON.stringify({ phone, code, template: this.config.get('VK_OTP_TEMPLATE') || undefined }),
      signal: AbortSignal.timeout(6000),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string }; response?: { request_id?: string; id?: string } };
    if (!res.ok || json.error) throw new OtpChannelError('vk', json.error?.message ?? `HTTP ${res.status}`);
    return { providerRequestId: json.response?.request_id ?? json.response?.id };
  }
}
