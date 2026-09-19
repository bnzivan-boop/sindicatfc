import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'node:crypto';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;

/**
 * OTP по телефону. Код хранится хэшем; лимиты на выдачу и попытки (handoff, 12 — rate limit).
 * Провайдер SMS абстрагирован: в dev код пишется в лог.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async issue(phone: string): Promise<void> {
    const since = new Date(Date.now() - 3_600_000);
    const recent = await this.prisma.otpChallenge.count({ where: { phone, createdAt: { gte: since } } });
    if (recent >= MAX_PER_HOUR) throw new HttpException('Слишком много запросов кода', HttpStatus.TOO_MANY_REQUESTS);

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.otpChallenge.create({
      data: { phone, codeHash: this.hash(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    await this.send(phone, code);
  }

  async verify(phone: string, code: string): Promise<void> {
    // Демо-режим: универсальный код без SMS (только при console-провайдере)
    const devCode = this.config.get('OTP_DEV_CODE');
    if (devCode && this.config.get('OTP_PROVIDER') === 'console' && code === devCode) return;

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { phone, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge || challenge.attempts >= MAX_ATTEMPTS) throw new UnauthorizedException('Код недействителен');

    if (challenge.codeHash !== this.hash(phone, code)) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('Неверный код');
    }
    await this.prisma.otpChallenge.delete({ where: { id: challenge.id } });
  }

  private hash(phone: string, code: string) {
    return createHash('sha256').update(`${phone}:${code}`).digest('hex');
  }

  private async send(phone: string, code: string) {
    if (this.config.get('OTP_PROVIDER') === 'console') {
      this.logger.warn(`[DEV OTP] ${phone} → ${code}`);
      return;
    }
    // TODO(этап 1): SMS-провайдер с резервным каналом и антифродом (handoff, раздел 11).
    throw new Error('SMS-провайдер не настроен');
  }
}
