import { Module } from '@nestjs/common';
import { RankingsController } from './rankings.controller.js';
import { RankingsService } from './rankings.service.js';

/** Rankings: очки, коэффициенты, сезоны, дисциплины, ledger, снапшоты, пересчёт. */
@Module({ controllers: [RankingsController], providers: [RankingsService], exports: [RankingsService] })
export class RankingsModule {}
