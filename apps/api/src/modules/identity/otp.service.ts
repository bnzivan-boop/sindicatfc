import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'node:crypto';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { OtpDeliveryService } from '../../infra/otp/otp-delivery.service.js';
import type { OtpChannelName } from '../../infra/otp/channel.js';

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
/** Лимит запросов кода на номер в час; в dev выше — из-за тестов (OTP_MAX_PER_HOUR). */
const DEFAULT_MAX_PER_HOUR = 5;

/**
 * OTP по телефону. Код хранится хэшем; лимиты на выдачу и попытки (handoff, 12 — rate limit).
 * Провайдер SMS абстрагирован: в dev код пишется в лог.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly delivery: OtpDeliveryService,
  ) {}

  /** Выдаёт код и доставляет каскадом; prefer — канал, который просит клиент («не пришло — отправить SMS»). */
  async issue(phone: string, prefer?: OtpChannelName) {
    const since = new Date(Date.now() - 3_600_000);
    const recent = await this.prisma.otpChallenge.count({ where: { phone, createdAt: { gte: since } } });
    const max = this.config.get('OTP_MAX_PER_HOUR') ?? DEFAULT_MAX_PER_HOUR;
    if (recent >= max) throw new HttpException(`Слишком много запросов кода (${max} в час). Попробуйте позже.`, HttpStatus.TOO_MANY_REQUESTS);

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const delivered = await this.delivery.deliver(phone, code, prefer);
    await this.prisma.otpChallenge.create({
      data: { phone, codeHash: this.hash(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS), channel: delivered.channel, providerRequestId: delivered.providerRequestId },
    });
    return { channel: delivered.channel, fallbacks: delivered.fallbacks, ttlSec: OTP_TTL_MS / 1000 };
  }

  async verify(phone: string, code: string): Promise<void> {
    // Демо-режим: универсальный код — только если в каскаде есть console-канал
    const devCode = this.config.get('OTP_DEV_CODE');
    if (devCode && this.delivery.available().includes('console') && code === devCode) return;

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

}
