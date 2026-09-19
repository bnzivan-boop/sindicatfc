import { Module } from '@nestjs/common';
import { CompetitionModule } from '../competition/competition.module.js';
import { OpsController } from './ops.controller.js';
import { OpsService } from './ops.service.js';
import { TournamentsController } from './tournaments.controller.js';
import { TournamentsService } from './tournaments.service.js';

/** Tournaments: события, дисциплины, правила, зоны, расписание, документы, статусы. */
@Module({ imports: [CompetitionModule], controllers: [TournamentsController, OpsController], providers: [TournamentsService, OpsService], exports: [TournamentsService] })
export class TournamentsModule {}
