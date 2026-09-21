import { Injectable, Logger } from '@nestjs/common';
import type { OtpChannel } from './channel.js';

/** Dev-канал: код в лог. Включается OTP_CHANNELS=console. */
@Injectable()
export class ConsoleOtpChannel implements OtpChannel {
  readonly name = 'console' as const;
  private readonly logger = new Logger('OTP');
  enabled() { return true; }
  async canSend() { return true; }
  async send(phone: string, code: string) { this.logger.warn(`[DEV OTP] ${phone} → ${code}`); return {}; }
}
