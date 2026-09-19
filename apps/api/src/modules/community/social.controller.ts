import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Discipline } from '@sindikat/domain';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/roles.decorator.js';
import { ZodBody } from '../../common/decorators/zod-body.decorator.js';
import { SocialService } from './social.service.js';

const tripSchema = z.object({ title: z.string().min(3).max(100), place: z.string().min(2).max(120), startsAt: z.string().datetime({ offset: true }), seats: z.number().int().min(1).max(20).default(2), details: z.string().max(1000).optional(), discipline: z.nativeEnum(Discipline).optional() });
const clubSchema = z.object({ name: z.string().min(3).max(60), city: z.string().max(60).optional(), discipline: z.nativeEnum(Discipline), recruiting: z.boolean().default(true), description: z.string().max(500).optional() });
const decideSchema = z.object({ userId: z.string().uuid(), accept: z.boolean() });

/** Выезды (поиск компании) и клубы. */
@ApiTags('community')
@Controller('community')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Public() @Get('trips') trips(@CurrentUser() u: AuthUser | undefined) { return this.social.trips(u?.id); }
  @Post('trips') @ApiBearerAuth() createTrip(@CurrentUser() u: AuthUser, @ZodBody(tripSchema) dto: z.infer<typeof tripSchema>) { return this.social.createTrip(u.id, dto); }
  @Post('trips/:id/join') @ApiBearerAuth() joinTrip(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.social.toggleTripRequest(u.id, id); }
  @Post('trips/:id/decide') @ApiBearerAuth() decideTrip(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(decideSchema) dto: z.infer<typeof decideSchema>) { return this.social.decideTrip(u.id, id, dto); }
  @Public() @Get('matches') matches(@CurrentUser() u: AuthUser | undefined) { return this.social.matches(u?.id); }

  @Public() @Get('clubs') clubs(@CurrentUser() u: AuthUser | undefined) { return this.social.clubs(u?.id); }
  @Public() @Get('clubs/:id') club(@CurrentUser() u: AuthUser | undefined, @Param('id', ParseUUIDPipe) id: string) { return this.social.club(id, u?.id); }
  @Post('clubs') @ApiBearerAuth() createClub(@CurrentUser() u: AuthUser, @ZodBody(clubSchema) dto: z.infer<typeof clubSchema>) { return this.social.createClub(u.id, dto); }
  @Post('clubs/:id/apply') @ApiBearerAuth() apply(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.social.toggleClubApplication(u.id, id); }
  @Post('clubs/:id/decide') @ApiBearerAuth() decideClub(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(decideSchema) dto: z.infer<typeof decideSchema>) { return this.social.decideClub(u.id, id, dto); }
}
