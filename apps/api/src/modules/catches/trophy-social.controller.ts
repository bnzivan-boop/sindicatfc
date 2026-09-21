import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/roles.decorator.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod-body.decorator.js';
import { CatchesService } from './catches.service.js';

const commentSchema = z.object({ text: z.string().min(1).max(1000) });
const feedQuery = z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(20), scope: z.enum(['all', 'friends']).default('all') });

/** Трофей как публичная карточка: галерея, характеристики, лайки, комментарии; лента опубликованных трофеев. */
@ApiTags('trophies')
@Controller()
export class TrophySocialController {
  constructor(private readonly catches: CatchesService) {}

  /** Лента: опубликованные трофеи всех участников, новые сверху. Доступна гостям. */
  @Public()
  @Get('feed/trophies')
  feed(@CurrentUser() user: AuthUser | undefined, @ZodQuery(feedQuery) q: z.infer<typeof feedQuery>) {
    return this.catches.feed(user?.id, q);
  }

  @Public()
  @Get('trophies/:id')
  detail(@CurrentUser() user: AuthUser | undefined, @Param('id', ParseUUIDPipe) id: string) {
    return this.catches.trophyDetail(id, user?.id);
  }

  @Post('trophies/:id/like')
  @ApiBearerAuth()
  like(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.catches.toggleLike(user.id, id);
  }

  @Post('trophies/:id/comments')
  @ApiBearerAuth()
  comment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(commentSchema) dto: z.infer<typeof commentSchema>) {
    return this.catches.addComment(user.id, id, dto.text);
  }

  @Delete('trophies/:id/comments/:commentId')
  @ApiBearerAuth()
  @HttpCode(204)
  removeComment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('commentId', ParseUUIDPipe) commentId: string) {
    return this.catches.removeComment(user.id, id, commentId);
  }
}
