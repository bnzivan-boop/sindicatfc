import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { gearCatalogQuerySchema } from '@sindikat/domain';
import type { z } from 'zod';
import { Public } from '../../common/decorators/roles.decorator.js';
import { ZodQuery } from '../../common/decorators/zod-body.decorator.js';
import { GearService } from './gear.service.js';

@ApiTags('gear')
@Controller('gear')
export class GearCatalogController {
  constructor(private readonly gear: GearService) {}

  /** GET /v1/gear/catalog?type=ROD&query= — один каталог для онбординга, профиля и редактора. */
  @Public()
  @Get('catalog')
  catalog(@ZodQuery(gearCatalogQuerySchema) q: z.infer<typeof gearCatalogQuerySchema>) {
    return this.gear.searchCatalog(q);
  }
}
