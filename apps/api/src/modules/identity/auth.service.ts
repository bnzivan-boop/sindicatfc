import { Injectable } from '@nestjs/common';
import type { OtpRequest, OtpVerify } from '@sindikat/domain';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { OtpService } from './otp.service.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
  ) {}

  async requestOtp(dto: OtpRequest) {
    const r = await this.otp.issue(dto.phone, dto.channel);
    return { status: 'sent', ...r };
  }

  /** Первый вход создаёт пользователя с пустым профилем — онбординг заполняет его. */
  async verifyOtp(dto: OtpVerify) {
    await this.otp.verify(dto.phone, dto.code);

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      create: {
        phone: dto.phone,
        roles: { create: { role: 'USER' } },
        consents: { create: dto.consents.map((c) => ({ type: c.type, version: c.version, source: 'otp_verify' })) },
      },
      update: { lastSeenAt: new Date() },
      include: { roles: true, profile: true },
    });

    let deviceId: string | undefined;
    if (dto.device) {
      const device = await this.prisma.device.create({
        data: { userId: user.id, platform: dto.device.platform, pushToken: dto.device.pushToken },
      });
      deviceId = device.id;
    }

    const pair = await this.tokens.issuePair(this.toAuthUser(user), deviceId);
    return { ...pair, isNewUser: user.profile === null };
  }

  async refresh(refreshToken: string) {
    const { userId, deviceId } = await this.tokens.consumeRefresh(refreshToken);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: true } });
    return this.tokens.issuePair(this.toAuthUser(user), deviceId ?? undefined);
  }

  async logout(userId: string, refreshToken?: string) {
    await this.tokens.revoke(userId, refreshToken);
  }

  private toAuthUser(user: {
    id: string;
    phone: string;
    roles: Array<{ role: AuthUser['roles'][number]['role']; scopeType: string; scopeId: string | null }>;
  }): AuthUser {
    return { id: user.id, phone: user.phone, roles: user.roles.map((r) => ({ role: r.role, scopeType: r.scopeType, scopeId: r.scopeId })) };
  }
}
