import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { trophyListQuerySchema, type TrophyListQuery } from '@sindikat/domain';
import { Public } from '../../common/decorators/roles.decorator.js';
import { ZodQuery } from '../../common/decorators/zod-body.decorator.js';
import { CatchesService } from './catches.service.js';

@ApiTags('trophies')
@Controller('users/:id/trophies')
export class TrophiesController {
  constructor(private readonly catches: CatchesService) {}

  /** Публичные трофеи с сортировкой по виду, весу, длине, дате. Точных координат нет по построению. */
  @Public()
  @Get()
  list(@Param('id', ParseUUIDPipe) userId: string, @ZodQuery(trophyListQuerySchema) q: TrophyListQuery) {
    return this.catches.listPublicTrophies(userId, q);
  }
}
