import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { upsertBoatSchema, upsertGearKitSchema, type UpsertBoat, type UpsertGearKit } from '@sindikat/domain';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { ZodBody } from '../../common/decorators/zod-body.decorator.js';
import { GearService } from './gear.service.js';

@ApiTags('gear')
@ApiBearerAuth()
@Controller('me')
export class GearKitsController {
  constructor(private readonly gear: GearService) {}

  @Get('gear-kits')
  list(@CurrentUser() user: AuthUser) {
    return this.gear.listKits(user.id);
  }

  @Get('gear-kits/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.gear.getKit(user.id, id);
  }

  @Post('gear-kits')
  create(@CurrentUser() user: AuthUser, @ZodBody(upsertGearKitSchema) dto: UpsertGearKit) {
    return this.gear.createKit(user.id, dto);
  }

  @Patch('gear-kits/:id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(upsertGearKitSchema.partial()) dto: Partial<UpsertGearKit>) {
    return this.gear.updateKit(user.id, id, dto);
  }

  @Delete('gear-kits/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.gear.deleteKit(user.id, id);
  }

  @Get('boat')
  boat(@CurrentUser() user: AuthUser) {
    return this.gear.getBoat(user.id);
  }

  @Put('boat')
  upsertBoat(@CurrentUser() user: AuthUser, @ZodBody(upsertBoatSchema) dto: UpsertBoat) {
    return this.gear.upsertBoat(user.id, dto);
  }
}
