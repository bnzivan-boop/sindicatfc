import { Module } from '@nestjs/common';
import { RankingsModule } from '../rankings/rankings.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

/** Admin: RBAC, аудит, справочники, жалобы, служебные операции. */
@Module({ imports: [RankingsModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
