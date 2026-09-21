import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { FriendsService } from './friends.service.js';

@ApiTags('friends')
@ApiBearerAuth()
@Controller('me/friends')
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  /** Друзья + входящие и исходящие заявки. */
  @Get() list(@CurrentUser() u: AuthUser) { return this.friends.list(u.id); }
  @Get('suggestions') suggestions(@CurrentUser() u: AuthUser) { return this.friends.suggestions(u.id); }
  @Get('status/:userId') status(@CurrentUser() u: AuthUser, @Param('userId', ParseUUIDPipe) other: string) { return this.friends.status(u.id, other); }

  @Post(':userId/request') request(@CurrentUser() u: AuthUser, @Param('userId', ParseUUIDPipe) other: string) { return this.friends.request(u.id, other); }
  @Post(':userId/accept') accept(@CurrentUser() u: AuthUser, @Param('userId', ParseUUIDPipe) other: string) { return this.friends.accept(u.id, other); }
  @Post(':userId/decline') decline(@CurrentUser() u: AuthUser, @Param('userId', ParseUUIDPipe) other: string) { return this.friends.decline(u.id, other); }
  @Post(':userId/block') block(@CurrentUser() u: AuthUser, @Param('userId', ParseUUIDPipe) other: string) { return this.friends.block(u.id, other); }
  @Post(':userId/unblock') unblock(@CurrentUser() u: AuthUser, @Param('userId', ParseUUIDPipe) other: string) { return this.friends.unblock(u.id, other); }
  /** Удалить из друзей или отменить свою заявку — тихо, без уведомления. */
  @Delete(':userId') @HttpCode(204) remove(@CurrentUser() u: AuthUser, @Param('userId', ParseUUIDPipe) other: string) { return this.friends.remove(u.id, other); }
}
