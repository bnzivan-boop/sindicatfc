import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RankingsModule } from '../rankings/rankings.module.js';
import { FinalizationService } from './finalization.service.js';
import { JudgingController } from './judging.controller.js';
import { LeaderboardService } from './leaderboard.service.js';
import { ProtestsService } from './protests.service.js';
import { ResultsController } from './results.controller.js';
import { ResultsService } from './results.service.js';

/** Competition: стартовые номера, маркеры, результаты, судейство, протесты, протокол. */
@Module({
  imports: [NotificationsModule, RankingsModule],
  controllers: [ResultsController, JudgingController],
  providers: [ResultsService, LeaderboardService, ProtestsService, FinalizationService],
  exports: [LeaderboardService, FinalizationService],
})
export class CompetitionModule {}
