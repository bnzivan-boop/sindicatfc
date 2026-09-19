import { Controller, Delete, Get, HttpCode, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LocationPrivacy, Visibility, mediaUploadUrlSchema, setDisciplinesSchema, updateProfileSchema, type MediaUploadUrl, type SetDisciplines, type UpdateProfile } from '@sindikat/domain';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { ZodBody } from '../../common/decorators/zod-body.decorator.js';
import { UsersService } from './users.service.js';

const privacySchema = z.object({ gearVisibility: z.nativeEnum(Visibility).optional(), locationPrivacy: z.nativeEnum(LocationPrivacy).optional() });
const deviceSchema = z.object({ platform: z.enum(['ios', 'android', 'web']), pushToken: z.string().min(10).max(200) });

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.users.getPrivateProfile(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthUser, @ZodBody(updateProfileSchema) dto: UpdateProfile) {
    return this.users.updateProfile(user.id, dto);
  }

  @Put('disciplines')
  setDisciplines(@CurrentUser() user: AuthUser, @ZodBody(setDisciplinesSchema) dto: SetDisciplines) {
    return this.users.setDisciplines(user.id, dto.disciplines);
  }

  /** Регистрация устройства для push (Expo push token). Один токен — одна запись. */
  @Put('devices')
  registerDevice(@CurrentUser() user: AuthUser, @ZodBody(deviceSchema) dto: z.infer<typeof deviceSchema>) {
    return this.users.registerDevice(user.id, dto);
  }

  @Delete('devices')
  @HttpCode(204)
  unregisterDevice(@CurrentUser() user: AuthUser, @ZodBody(z.object({ pushToken: z.string() })) dto: { pushToken: string }) {
    return this.users.unregisterDevice(user.id, dto.pushToken);
  }

  @Post('avatar/upload-url')
  avatarUploadUrl(@CurrentUser() user: AuthUser, @ZodBody(mediaUploadUrlSchema) dto: MediaUploadUrl) {
    return this.users.createAvatarUploadUrl(user.id, dto);
  }

  /** Настройки приватности: видимость арсенала по умолчанию и геолокации уловов. */
  @Get('privacy')
  getPrivacy(@CurrentUser() user: AuthUser) {
    return this.users.privacy(user.id);
  }

  @Patch('privacy')
  privacy(@CurrentUser() user: AuthUser, @ZodBody(privacySchema) dto: z.infer<typeof privacySchema>) {
    return this.users.updatePrivacy(user.id, dto);
  }
}
