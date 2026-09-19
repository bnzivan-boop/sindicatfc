import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

/** Access — короткоживущий JWT; refresh — случайная строка, хранится хэшем в sessions. */
@Injectable()
export class TokenService {
  private readonly accessSecret: Uint8Array;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.accessSecret = new TextEncoder().encode(config.get('JWT_ACCESS_SECRET'));
  }

  async issuePair(user: AuthUser, deviceId?: string) {
    const accessTtl = this.config.get('JWT_ACCESS_TTL');
    const accessToken = await new SignJWT({ phone: user.phone, roles: user.roles })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${accessTtl}s`)
      .sign(this.accessSecret);

    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.session.create({
      data: {
        userId: user.id,
        deviceId,
        refreshTokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + this.config.get('JWT_REFRESH_TTL') * 1000),
      },
    });
    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  async verifyAccess(token: string): Promise<AuthUser> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret);
      return { id: payload.sub!, phone: payload['phone'] as string, roles: payload['roles'] as AuthUser['roles'] };
    } catch {
      throw new UnauthorizedException('Токен недействителен');
    }
  }

  /** Возвращает userId и отзывает сессию (ротация refresh). */
  async consumeRefresh(refreshToken: string): Promise<{ userId: string; deviceId: string | null }> {
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: this.hash(refreshToken) } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Сессия недействительна');
    }
    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return { userId: session.userId, deviceId: session.deviceId };
  }

  async revoke(userId: string, refreshToken?: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(refreshToken ? { refreshTokenHash: this.hash(refreshToken) } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
