import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Push через Expo Push API (handoff §11): один HTTP-вызов на пачку токенов,
 * без SDK — меньше зависимостей. Невалидные токены (DeviceNotRegistered) удаляются.
 * Работает fire-and-forget: ошибка доставки не ломает бизнес-операцию.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly endpoint = 'https://exp.host/--/api/v2/push/send';

  constructor(private readonly prisma: PrismaService) {}

  async sendToUser(userId: string, message: { title: string; body: string; data?: Record<string, unknown> }) {
    const devices = await this.prisma.device.findMany({ where: { userId, pushToken: { not: null } } });
    const tokens = devices.map((d) => d.pushToken!).filter((t) => t.startsWith('ExponentPushToken['));
    if (tokens.length === 0) return;

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(tokens.map((to) => ({ to, title: message.title, body: message.body, data: message.data, sound: 'default', channelId: 'default' }))),
      });
      const json = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };
      const dead = tokens.filter((_, i) => json.data?.[i]?.details?.error === 'DeviceNotRegistered');
      if (dead.length) await this.prisma.device.updateMany({ where: { pushToken: { in: dead } }, data: { pushToken: null } });
    } catch (e) {
      this.logger.warn(`push не доставлен: ${e instanceof Error ? e.message : e}`);
    }
  }
}
