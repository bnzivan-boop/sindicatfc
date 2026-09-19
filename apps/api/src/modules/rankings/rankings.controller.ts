import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Discipline } from '@sindikat/domain';
import { z } from 'zod';
import { Public, Roles } from '../../common/decorators/roles.decorator.js';
import { ZodQuery } from '../../common/decorators/zod-body.decorator.js';
import { RankingsService } from './rankings.service.js';

const rankingsQuery = z.object({ season: z.coerce.number().int().optional(), discipline: z.nativeEnum(Discipline) });

@ApiTags('rankings')
@Controller()
export class RankingsController {
  constructor(private readonly rankings: RankingsService) {}

  @Public()
  @Get('rankings')
  list(@ZodQuery(rankingsQuery) q: z.infer<typeof rankingsQuery>) {
    return this.rankings.table(q);
  }

  /** Полный пересбор проекции из ledger — критерий приёмки MVP. */
  @Post('admin/seasons/:seasonId/rankings/rebuild')
  @ApiBearerAuth()
  @Roles('SYSTEM_ADMIN')
  rebuild(@Param('seasonId', ParseUUIDPipe) seasonId: string) {
    return this.rankings.rebuild(seasonId);
  }
}
