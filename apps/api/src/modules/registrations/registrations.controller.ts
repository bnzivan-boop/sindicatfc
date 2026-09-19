import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { createRegistrationSchema, inviteMemberSchema, type CreateRegistration, type InviteMember } from '@sindikat/domain';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodBody } from '../../common/decorators/zod-body.decorator.js';
import { IdempotencyInterceptor, IdempotencyKey } from '../../common/interceptors/idempotency.interceptor.js';
import { RegistrationsService } from './registrations.service.js';

@ApiTags('registrations')
@ApiBearerAuth()
@Controller()
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('tournaments/:id/registrations')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) tournamentId: string,
    @ZodBody(createRegistrationSchema) dto: CreateRegistration,
    @IdempotencyKey() key: string,
  ) {
    return this.registrations.create(user.id, tournamentId, dto, key);
  }

  /** Мои заявки по всем турнирам (кабинет участника). */
  @Get('me/registrations')
  mine(@CurrentUser() user: AuthUser) {
    return this.registrations.listMine(user.id);
  }

  /** Приглашения в парные/командные заявки, ожидающие моего ответа. */
  @Get('me/invitations')
  invitations(@CurrentUser() user: AuthUser) {
    return this.registrations.listInvitations(user.id);
  }

  @Get('registrations/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.registrations.getForUser(user.id, id);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('registrations/:id/members/invite')
  invite(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(inviteMemberSchema) dto: InviteMember) {
    return this.registrations.invite(user.id, id, dto);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('registrations/:id/members/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.registrations.acceptInvitation(user.id, id);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('registrations/:id/members/decline')
  decline(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.registrations.declineInvitation(user.id, id);
  }

  /* ── организатор ── */

  @Post('tournaments/:tournamentId/start-numbers')
  @Roles('ORGANIZER')
  startNumbers(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) tournamentId: string) {
    return this.registrations.assignStartNumbers(tournamentId, user.id);
  }

  @Post('tournaments/:tournamentId/registrations/:id/check-in')
  @Roles('ORGANIZER', 'JUDGE')
  checkIn(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) tournamentId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.registrations.checkIn(tournamentId, id, user.id);
  }

  @Post('tournaments/:tournamentId/registrations/:id/reject')
  @Roles('ORGANIZER')
  reject(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) tournamentId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: { reason?: string }) {
    return this.registrations.rejectByOrganizer(tournamentId, id, user.id, body?.reason);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('registrations/:id/payments')
  pay(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @IdempotencyKey() key: string) {
    return this.registrations.startPayment(user.id, id, key);
  }

  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('registrations/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.registrations.cancel(user.id, id);
  }
}
