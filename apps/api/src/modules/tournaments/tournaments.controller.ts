import { Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { tournamentListQuerySchema, upsertRulesSchema, upsertTournamentSchema, type TournamentListQuery, type TournamentStatus, type UpsertRules, type UpsertTournament } from '@sindikat/domain';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public, Roles } from '../../common/decorators/roles.decorator.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod-body.decorator.js';
import { TournamentsService } from './tournaments.service.js';

const transitionSchema = z.object({ to: z.string() });

@ApiTags('tournaments')
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  @Public()
  @Get()
  list(@ZodQuery(tournamentListQuerySchema) q: TournamentListQuery) {
    return this.tournaments.list(q);
  }

  @Public()
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.detail(id);
  }

  /** Публичный список участников: только подтверждённые заявки, без телефонов и оплат. */
  @Public()
  @Get(':id/participants')
  participants(@Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.publicParticipants(id);
  }

  @Public()
  @Get(':id/rules')
  rules(@Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.currentRules(id);
  }

  /* ── Кабинет организатора ── */

  @Get('mine/all')
  @ApiBearerAuth()
  @Roles('ORGANIZER')
  listAll(@ZodQuery(tournamentListQuerySchema) q: TournamentListQuery) {
    return this.tournaments.list(q, { includeDrafts: true });
  }

  @Post()
  @ApiBearerAuth()
  @Roles('ORGANIZER')
  create(@CurrentUser() user: AuthUser, @ZodBody(upsertTournamentSchema) dto: UpsertTournament) {
    return this.tournaments.create(user.id, dto);
  }

  @Patch(':tournamentId')
  @ApiBearerAuth()
  @Roles('ORGANIZER')
  update(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) id: string, @ZodBody(upsertTournamentSchema.partial()) dto: Partial<UpsertTournament>) {
    return this.tournaments.update(id, user.id, dto);
  }

  @Post(':tournamentId/rules')
  @ApiBearerAuth()
  @Roles('ORGANIZER')
  createRules(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) id: string, @ZodBody(upsertRulesSchema) dto: UpsertRules) {
    return this.tournaments.createRulesVersion(id, user.id, dto);
  }

  @Get(':tournamentId/registrations')
  @ApiBearerAuth()
  @Roles('ORGANIZER', 'JUDGE', 'HEAD_JUDGE')
  registrations(@Param('tournamentId', ParseUUIDPipe) id: string) {
    return this.tournaments.registrations(id);
  }

  /** Смена статуса организатором по статусной машине из @sindikat/domain. */
  @Post(':tournamentId/transition')
  @ApiBearerAuth()
  @Roles('ORGANIZER')
  transition(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) id: string, @ZodBody(transitionSchema) dto: { to: string }) {
    return this.tournaments.transition(id, dto.to as TournamentStatus, user.id);
  }
}
