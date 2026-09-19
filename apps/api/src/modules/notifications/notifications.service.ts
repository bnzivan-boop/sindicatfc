import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/index.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { PushService } from '../../infra/push/push.service.js';

export type NotificationKind =
  | 'tournament.reminder'
  | 'registration.invited'
  | 'registration.confirmed'
  | 'result.accepted'
  | 'result.rejected'
  | 'result.resubmission'
  | 'protest.resolved'
  | 'schedule.changed'
  | 'trophy.comment'
  | 'trophy.like';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  list(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  }

  /** In-app всегда; push — сразу же на все устройства пользователя (без ожидания результата). */
  async send(userId: string, kind: NotificationKind, title: string, body: string, payload?: Prisma.InputJsonObject) {
    const n = await this.prisma.notification.create({ data: { userId, kind, title, body, payload } });
    void this.push.sendToUser(userId, { title, body, data: { kind, notificationId: n.id, ...(payload ?? {}) } });
    return n;
  }

  /** Счётчик непрочитанных — для бейджа на колокольчике. */
  async unreadCount(userId: string) {
    return { unread: await this.prisma.notification.count({ where: { userId, readAt: null } }) };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}
