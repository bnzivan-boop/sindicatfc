import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/roles.decorator.js';
import { ZodQuery } from '../../common/decorators/zod-body.decorator.js';
import { z } from 'zod';

const searchSchema = z.object({ q: z.string().min(2).max(60) });
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Поиск напарника по имени (публичные данные, только заполненные профили). */
  @Public()
  @Get()
  search(@ZodQuery(searchSchema) q: z.infer<typeof searchSchema>) {
    return this.users.search(q.q);
  }

  /** Публичный профиль: без телефона, точных координат и документов. */
  @Public()
  @Get(':id')
  publicProfile(@CurrentUser() viewer: AuthUser | undefined, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.getPublicProfile(id, viewer?.id);
  }

  /** Комплекты с видимостью PUBLIC, а для друзей — и FRIENDS; документы лодки не отдаются никогда. */
  @Public()
  @Get(':id/gear-kits')
  publicKits(@CurrentUser() viewer: AuthUser | undefined, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.getPublicKits(id, viewer?.id);
  }
}

@ApiTags('users')
@Controller('cities')
export class CitiesController {
  constructor(private readonly users: UsersService) {}

  /** Справочник городов для онбординга. */
  @Public()
  @Get()
  list() {
    return this.users.listCities();
  }
}
