/**
 * Канал доставки кода подтверждения. Каскад: telegram → vk → sms (порядок из OTP_CHANNELS).
 * canSend — дешёвая проверка «дойдёт ли» (у Telegram Gateway есть checkSendAbility), send — отправка.
 * Любая ошибка канала → переход к следующему; клиент видит, куда ушёл код.
 */
export type OtpChannelName = 'telegram' | 'vk' | 'sms' | 'console';

export interface OtpChannel {
  readonly name: OtpChannelName;
  /** Настроен ли канал (есть ключи). */
  enabled(): boolean;
  /** Может ли доставить на этот номер. undefined — проверить нельзя, пробуем отправить. */
  canSend(phone: string): Promise<boolean | undefined>;
  /** Отправить код. Бросает исключение при неудаче. Возвращает id запроса у провайдера. */
  send(phone: string, code: string): Promise<{ providerRequestId?: string }>;
}

export class OtpChannelError extends Error {
  constructor(public readonly channel: OtpChannelName, message: string) {
    super(`${channel}: ${message}`);
  }
}
