import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { otpRequestSchema, otpVerifySchema, type OtpRequest, type OtpVerify } from '@sindikat/domain';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/roles.decorator.js';
import { ZodBody } from '../../common/decorators/zod-body.decorator.js';
import { AuthService } from './auth.service.js';

const refreshSchema = z.object({ refreshToken: z.string().min(16) });

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/request')
  @HttpCode(202)
  @ApiOperation({ summary: 'Запросить код по SMS' })
  requestOtp(@ZodBody(otpRequestSchema) dto: OtpRequest) {
    return this.auth.requestOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  @ApiOperation({ summary: 'Подтвердить код, получить пару токенов' })
  verifyOtp(@ZodBody(otpVerifySchema) dto: OtpVerify) {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Обновить пару токенов' })
  refresh(@ZodBody(refreshSchema) dto: z.infer<typeof refreshSchema>) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth()
  logout(@CurrentUser() user: AuthUser, @Body() body: { refreshToken?: string }) {
    return this.auth.logout(user.id, body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Кто я (id, телефон, роли)' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
