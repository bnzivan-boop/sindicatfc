import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Discipline, Role, RoleScopeType, paginationQuerySchema, type PaginationQuery } from '@sindikat/domain';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod-body.decorator.js';
import { AdminService } from './admin.service.js';

const grantRoleSchema = z.object({ userId: z.string().uuid(), role: z.nativeEnum(Role), scopeType: z.nativeEnum(RoleScopeType).default('GLOBAL'), scopeId: z.string().uuid().optional() });
const usersQuery = z.object({ q: z.string().max(60).optional(), role: z.nativeEnum(Role).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) });
const seasonSchema = z.object({ year: z.number().int().min(2024).max(2100), title: z.string().min(2).max(60), startsAt: z.string().datetime({ offset: true }), endsAt: z.string().datetime({ offset: true }) });
const rulesSchema = z.object({
  discipline: z.nativeEnum(Discipline).nullable().default(null),
  levelCoefficients: z.object({ SPRINT: z.number(), QUALIFIER: z.number(), OPEN: z.number(), MAJOR: z.number(), GRAND_FINAL: z.number() }),
  disciplineCoefficients: z.record(z.number()).default({}),
  bestResultsCount: z.number().int().min(1).nullable(),
  minStartsForFinal: z.number().int().min(1),
  basePointsByPlace: z.array(z.number()).min(1),
  floorPoints: z.number().min(0),
  tieBreakers: z.array(z.enum(['BIGGEST_FISH', 'MORE_FISH', 'EARLIER_LAST_FISH', 'HEAD_TO_HEAD'])),
  note: z.string().max(300).optional(),
});
const adjustSchema = z.object({ userId: z.string().uuid(), discipline: z.nativeEnum(Discipline), delta: z.number(), reason: z.string().min(5).max(300), tournamentId: z.string().uuid().optional() });
const speciesSchema = z.object({ slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/), nameRu: z.string().min(2).max(60), nameLat: z.string().max(80).optional(), isPredator: z.boolean().default(false) });
const approveGearSchema = z.object({ brandName: z.string().min(1).max(80), modelName: z.string().min(1).max(120) });

@ApiTags('admin')
@ApiBearerAuth()
@Roles('SYSTEM_ADMIN', 'SUPPORT', 'ORGANIZER')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard') dashboard() { return this.admin.dashboard(); }

  /* ── пользователи и роли ── */
  @Get('users') users(@ZodQuery(usersQuery) q: z.infer<typeof usersQuery>) { return this.admin.users(q); }
  @Get('users/:id') user(@Param('id', ParseUUIDPipe) id: string) { return this.admin.user(id); }
  @Post('users/:id/block') @Roles('SYSTEM_ADMIN', 'SUPPORT') block(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.setStatus(a.id, id, 'BLOCKED'); }
  @Post('users/:id/unblock') @Roles('SYSTEM_ADMIN', 'SUPPORT') unblock(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.setStatus(a.id, id, 'ACTIVE'); }
  @Post('roles/grant') @Roles('SYSTEM_ADMIN', 'SUPPORT') grant(@CurrentUser() actor: AuthUser, @ZodBody(grantRoleSchema) dto: z.infer<typeof grantRoleSchema>) { return this.admin.grantRole(actor.id, dto); }
  @Delete('roles/:id') @Roles('SYSTEM_ADMIN', 'SUPPORT') @HttpCode(204) revoke(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.revokeRole(actor.id, id); }

  /* ── сезоны и правила рейтинга ── */
  @Get('seasons') seasons() { return this.admin.seasons(); }
  @Post('seasons') @Roles('SYSTEM_ADMIN') createSeason(@CurrentUser() a: AuthUser, @ZodBody(seasonSchema) dto: z.infer<typeof seasonSchema>) { return this.admin.createSeason(a.id, dto); }
  @Post('seasons/:id/activate') @Roles('SYSTEM_ADMIN') activate(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.admin.activateSeason(a.id, id); }
  @Get('seasons/:id/ranking-rules') rankingRules(@Param('id', ParseUUIDPipe) id: string) { return this.admin.rankingRules(id); }
  @Post('seasons/:id/ranking-rules') @Roles('SYSTEM_ADMIN') createRules(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(rulesSchema) dto: z.infer<typeof rulesSchema>) { return this.admin.createRankingRules(a.id, id, dto); }
  @Get('seasons/:id/ledger') ledger(@Param('id', ParseUUIDPipe) id: string, @ZodQuery(z.object({ userId: z.string().uuid().optional(), discipline: z.nativeEnum(Discipline).optional(), limit: z.coerce.number().int().max(500).default(200) })) q: { userId?: string; discipline?: Discipline; limit: number }) { return this.admin.ledger(id, q); }
  @Post('seasons/:id/adjust') @Roles('SYSTEM_ADMIN') adjust(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(adjustSchema) dto: z.infer<typeof adjustSchema>) { return this.admin.adjustPoints(a.id, id, dto); }

  /* ── справочники ── */
  @Get('species') species() { return this.admin.species(); }
  @Post('species') @Roles('SYSTEM_ADMIN') createSpecies(@ZodBody(speciesSchema) dto: z.infer<typeof speciesSchema>) { return this.admin.createSpecies(dto); }
  @Patch('species/:id') @Roles('SYSTEM_ADMIN') updateSpecies(@Param('id', ParseUUIDPipe) id: string, @ZodBody(speciesSchema.partial()) dto: Partial<z.infer<typeof speciesSchema>>) { return this.admin.updateSpecies(id, dto); }
  @Get('gear/custom-requests') customGear() { return this.admin.pendingGearRequests(); }
  @Post('gear/custom-requests/:id/approve') approveGear(@CurrentUser() a: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(approveGearSchema) dto: z.infer<typeof approveGearSchema>) { return this.admin.approveGearRequest(a.id, id, dto); }
  @Get('gear/catalog') gearCatalog() { return this.admin.gearCatalog(); }

  /* ── сообщество и аудит ── */
  @Get('community/posts') posts() { return this.admin.recentPosts(); }
  @Get('audit') audit(@ZodQuery(paginationQuerySchema) q: PaginationQuery) { return this.admin.auditLog(q); }
}
