import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Discipline } from '@sindikat/domain';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodBody } from '../../common/decorators/zod-body.decorator.js';
import { OpsService } from './ops.service.js';

const opsSchema = z.object({
  checklist: z.array(z.object({ key: z.string(), title: z.string(), note: z.string().optional(), status: z.enum(['DONE', 'TODO', 'NA']) })).default([]),
  budget: z.array(z.object({ title: z.string(), amountMinor: z.number().int(), kind: z.enum(['INCOME', 'EXPENSE']) })).default([]),
  partners: z.array(z.object({ title: z.string(), description: z.string().optional(), priceMinor: z.number().int().nullable().optional(), status: z.enum(['OFFERED', 'CONFIRMED', 'DECLINED']).default('OFFERED') })).default([]),
  prizeFundMinor: z.number().int().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});
export type OpsInput = z.infer<typeof opsSchema>;

const markerSchema = z.object({ code: z.string().min(2).max(32), validFrom: z.string().datetime({ offset: true }), validTo: z.string().datetime({ offset: true }) });
const templateSchema = z.object({ discipline: z.nativeEnum(Discipline).optional() });

/** Операционный контур организатора: чек-лист, бюджет, партнёры, маркеры, все результаты, лист ожидания, дублирование. */
@ApiTags('organizer')
@ApiBearerAuth()
@Roles('ORGANIZER')
@Controller('tournaments/:tournamentId')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get('ops') getOps(@Param('tournamentId', ParseUUIDPipe) id: string) { return this.ops.getOps(id); }
  @Put('ops') putOps(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) id: string, @ZodBody(opsSchema) dto: OpsInput) { return this.ops.putOps(id, user.id, dto); }

  @Get('markers') markers(@Param('tournamentId', ParseUUIDPipe) id: string) { return this.ops.markers(id); }
  @Post('markers') addMarker(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) id: string, @ZodBody(markerSchema) dto: z.infer<typeof markerSchema>) { return this.ops.addMarker(id, user.id, dto); }

  @Get('results') results(@Param('tournamentId', ParseUUIDPipe) id: string) { return this.ops.allResults(id); }
  @Get('waitlist') waitlist(@Param('tournamentId', ParseUUIDPipe) id: string) { return this.ops.waitlist(id); }

  /** Копия турнира черновиком (карточка, локация, регламент, тайминг), дата +7 дней. */
  @Post('duplicate') duplicate(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) id: string) { return this.ops.duplicate(id, user.id); }

  /** Применить шаблон регламента дисциплины (новая версия, опубликована). */
  @Post('rules/template') applyTemplate(@CurrentUser() user: AuthUser, @Param('tournamentId', ParseUUIDPipe) id: string, @Body() body: z.infer<typeof templateSchema>) { return this.ops.applyRulesTemplate(id, user.id, templateSchema.parse(body ?? {}).discipline); }
}
