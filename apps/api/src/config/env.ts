import { z } from 'zod';

/** Схема окружения. Приложение не стартует с неполной конфигурацией. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ACCESS_TTL: z.coerce.number().int().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().default(30 * 24 * 3600),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET_MEDIA: z.string(),
  S3_BUCKET_PRIVATE: z.string(),
  /** Каскад каналов доставки кода через запятую: telegram,vk,sms (dev: console). Неподключённые пропускаются. */
  OTP_CHANNELS: z.string().default('console'),
  /** Универсальный код для демо-входа; работает только если в каскаде есть console. */
  OTP_DEV_CODE: z.string().regex(/^\d{4,6}$/).optional(),
  TELEGRAM_GATEWAY_TOKEN: z.string().optional(),
  TELEGRAM_GATEWAY_SENDER: z.string().optional(),
  VK_OTP_URL: z.string().url().or(z.literal('')).optional(),
  VK_OTP_TOKEN: z.string().optional(),
  VK_OTP_TEMPLATE: z.string().optional(),
  SMS_URL: z.string().url().or(z.literal('')).optional(),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Некорректное окружение:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return parsed.data;
}
