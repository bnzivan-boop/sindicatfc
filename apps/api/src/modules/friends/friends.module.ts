import { Global, Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { FriendsController } from './friends.controller.js';
import { FriendsService } from './friends.service.js';

/** Друзья: заявки, принятие, блокировка, рекомендации. Глобальный — на FriendsService опираются приватность и лента. */
@Global()
@Module({ imports: [NotificationsModule], controllers: [FriendsController], providers: [FriendsService], exports: [FriendsService] })
export class FriendsModule {}
