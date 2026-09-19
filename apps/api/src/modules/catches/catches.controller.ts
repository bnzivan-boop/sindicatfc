import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createCatchSchema, mediaUploadUrlSchema, type CreateCatch, type MediaUploadUrl } from '@sindikat/domain';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/roles.decorator.js';
import { ZodBody } from '../../common/decorators/zod-body.decorator.js';
import { CatchesService } from './catches.service.js';

@ApiTags('catches')
@ApiBearerAuth()
@Controller('me/catches')
export class CatchesController {
  constructor(private readonly catches: CatchesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.catches.listOwn(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ZodBody(createCatchSchema) dto: CreateCatch) {
    return this.catches.create(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.catches.remove(user.id, id);
  }

  @Post(':id/media/upload-url')
  mediaUploadUrl(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(mediaUploadUrlSchema) dto: MediaUploadUrl) {
    return this.catches.createMediaUploadUrl(user.id, id, dto);
  }

  /** Повысить запись дневника до трофея — карточка уходит на модерацию. */
  @Post(':id/promote-to-trophy')
  promote(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.catches.promoteToTrophy(user.id, id);
  }
}

@ApiTags('catches')
@Controller('species')
export class SpeciesController {
  constructor(private readonly catches: CatchesService) {}

  /** Справочник видов рыб для форм улова и результата. */
  @Public()
  @Get()
  list() {
    return this.catches.listSpecies();
  }
}
