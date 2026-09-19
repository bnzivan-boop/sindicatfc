import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { judgeDecisionSchema, type JudgeDecisionInput } from '@sindikat/domain';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodBody } from '../../common/decorators/zod-body.decorator.js';
import { ProtestsService } from './protests.service.js';
import { ResultsService } from './results.service.js';

const resolveProtestSchema = z.object({ status: z.enum(['UPHELD', 'DISMISSED']), resolution: z.string().min(5).max(2000), lengthMm: z.number().int().optional(), weightG: z.number().int().optional() });

/** Судейский контур. Роли проверяются с областью турнира (RolesGuard). */
@ApiTags('judging')
@ApiBearerAuth()
@Controller()
export class JudgingController {
  constructor(
    private readonly results: ResultsService,
    private readonly protests: ProtestsService,
  ) {}

  /** Очередь: только полностью загруженные результаты (≥ SUBMITTED). */
  @Get('tournaments/:tournamentId/judging/queue')
  @Roles('JUDGE', 'HEAD_JUDGE', 'ORGANIZER')
  queue(@Param('tournamentId', ParseUUIDPipe) tournamentId: string) {
    return this.results.judgeQueue(tournamentId);
  }

  @Post('tournaments/:tournamentId/results/:resultId/judge-decisions')
  @Roles('JUDGE', 'HEAD_JUDGE')
  decide(
    @CurrentUser() user: AuthUser,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @ZodBody(judgeDecisionSchema) dto: JudgeDecisionInput,
  ) {
    return this.results.decide(user.id, tournamentId, resultId, dto);
  }

  @Get('tournaments/:tournamentId/protests')
  @Roles('HEAD_JUDGE', 'ORGANIZER')
  listProtests(@Param('tournamentId', ParseUUIDPipe) tournamentId: string) {
    return this.protests.list(tournamentId);
  }

  @Post('tournaments/:tournamentId/protests/:protestId/resolve')
  @Roles('HEAD_JUDGE')
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @Param('protestId', ParseUUIDPipe) protestId: string,
    @ZodBody(resolveProtestSchema) dto: z.infer<typeof resolveProtestSchema>,
  ) {
    return this.protests.resolve(user.id, tournamentId, protestId, dto);
  }
}
