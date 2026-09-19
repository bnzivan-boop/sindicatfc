import { Module } from '@nestjs/common';
import { CatchesController, SpeciesController } from './catches.controller.js';
import { CatchesService } from './catches.service.js';
import { TrophiesController } from './trophies.controller.js';
import { TrophySocialController } from './trophy-social.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

/** Trophies: уловы (дневник), трофеи, фото, геоприватность, рекорды. */
@Module({ imports: [NotificationsModule], controllers: [CatchesController, SpeciesController, TrophiesController, TrophySocialController], providers: [CatchesService], exports: [CatchesService] })
export class CatchesModule {}
