import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CommunityController } from './community.controller.js';
import { CommunityService } from './community.service.js';
import { SocialController } from './social.controller.js';
import { SocialService } from './social.service.js';

/** Community: каналы, участники, рубрики, публикации, реакции. Клубы/выезды — следующий шаг. */
@Module({ imports: [NotificationsModule], controllers: [CommunityController, SocialController], providers: [CommunityService, SocialService], exports: [CommunityService] })
export class CommunityModule {}
