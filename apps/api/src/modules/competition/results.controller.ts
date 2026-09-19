import { Controller, Get, Param, ParseUUIDPipe, Post, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createProtestSchema,
  createResultDraftSchema,
  mediaUploadUrlSchema,
  type CreateProtest,
  type CreateResultDraft,
  type MediaUploadUrl,
} from '@sindikat/domain';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/roles.decorator.js';
import { ZodBody } from '../../common/decorators/zod-body.decorator.js';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor.js';
import { LeaderboardService } from './leaderboard.service.js';
import { ProtestsService } from './protests.service.js';
import { ResultsService } from './results.service.js';

@ApiTags('competition')
@Controller()
export class ResultsController {
  constructor(
    private readonly results: ResultsService,
    private readonly leaderboard: LeaderboardService,
    private readonly protests: ProtestsService,
  ) {}

  /** Шаг 1 (handoff 7.4): черновик результата → result_id. Идемпотентен по clientId. */
  @Post('tournaments/:id/results')
  @ApiBearerAuth()
  @UseInterceptors(IdempotencyInterceptor)
  createDraft(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) tournamentId: string, @ZodBody(createResultDraftSchema) dto: CreateResultDraft) {
    return this.results.createDraft(user.id, tournamentId, dto);
  }

  /** Шаг 2: одноразовый URL загрузки фото. */
  @Post('results/:id/media/upload-url')
  @ApiBearerAuth()
  uploadUrl(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(mediaUploadUrlSchema) dto: MediaUploadUrl) {
    return this.results.createMediaUploadUrl(user.id, id, dto);
  }

  /** Шаг 3: подтверждение загрузки → SUBMITTED → очередь судьи. */
  @Post('results/:id/submit')
  @ApiBearerAuth()
  @UseInterceptors(IdempotencyInterceptor)
  submit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.results.submit(user.id, id);
  }

  @Get('tournaments/:id/results/mine')
  @ApiBearerAuth()
  mine(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) tournamentId: string) {
    return this.results.listMine(user.id, tournamentId);
  }

  @Public()
  @Get('tournaments/:id/leaderboard')
  leaderboardOf(@Param('id', ParseUUIDPipe) tournamentId: string) {
    return this.leaderboard.current(tournamentId);
  }

  @Get('tournaments/:id/protests/mine')
  @ApiBearerAuth()
  myProtests(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) tournamentId: string) {
    return this.protests.listMine(user.id, tournamentId);
  }

  @Post('tournaments/:id/protests')
  @ApiBearerAuth()
  protest(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) tournamentId: string, @ZodBody(createProtestSchema) dto: CreateProtest) {
    return this.protests.create(user.id, tournamentId, dto);
  }
}
