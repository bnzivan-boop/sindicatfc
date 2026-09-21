import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/roles.decorator.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod-body.decorator.js';
import { CommunityService } from './community.service.js';

const createChannelSchema = z.object({ name: z.string().min(3).max(60), city: z.string().max(60).optional(), description: z.string().max(300).optional() });
const createPostSchema = z.object({ title: z.string().min(3).max(120), text: z.string().min(1).max(4000), rubricId: z.string().uuid().optional() });
const commentSchema = z.object({ text: z.string().min(1).max(1000) });
const feedQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20), channelId: z.string().uuid().optional(), scope: z.enum(['all', 'friends']).default('all') });

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Public() @Get('channels')
  channels(@CurrentUser() user: AuthUser | undefined) { return this.community.listChannels(user?.id); }

  @Public() @Get('channels/:id')
  channel(@CurrentUser() user: AuthUser | undefined, @Param('id', ParseUUIDPipe) id: string) { return this.community.channel(id, user?.id); }

  @Post('channels') @ApiBearerAuth()
  createChannel(@CurrentUser() user: AuthUser, @ZodBody(createChannelSchema) dto: z.infer<typeof createChannelSchema>) { return this.community.createChannel(user.id, dto); }

  @Post('channels/:id/join') @ApiBearerAuth()
  join(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.community.toggleMembership(user.id, id); }

  /** Лента постов: все каналы или один. Гостям — тоже. */
  @Public() @Get('posts')
  posts(@CurrentUser() user: AuthUser | undefined, @ZodQuery(feedQuery) q: z.infer<typeof feedQuery>) { return this.community.listPosts(user?.id, q); }

  @Public() @Get('posts/:id')
  post(@CurrentUser() user: AuthUser | undefined, @Param('id', ParseUUIDPipe) id: string) { return this.community.post(id, user?.id); }

  @Post('channels/:id/posts') @ApiBearerAuth()
  createPost(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) channelId: string, @ZodBody(createPostSchema) dto: z.infer<typeof createPostSchema>) { return this.community.createPost(user.id, channelId, dto); }

  @Post('posts/:id/like') @ApiBearerAuth()
  like(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.community.toggleLike(user.id, id); }

  @Post('posts/:id/comments') @ApiBearerAuth()
  comment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ZodBody(commentSchema) dto: z.infer<typeof commentSchema>) { return this.community.addComment(user.id, id, dto.text); }

  @Delete('posts/:id') @ApiBearerAuth() @HttpCode(204)
  removePost(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.community.removePost(user.id, id); }
}
