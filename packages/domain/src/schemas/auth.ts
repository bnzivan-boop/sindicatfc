import { z } from 'zod';
import { ConsentType } from '../enums/user.js';
import { phoneSchema } from './common.js';

/** Канал доставки кода; без него — каскад telegram → vk → sms. */
export const OtpChannel = { TELEGRAM: 'telegram', VK: 'vk', SMS: 'sms', CONSOLE: 'console' } as const;
export type OtpChannel = (typeof OtpChannel)[keyof typeof OtpChannel];

export const otpRequestSchema = z.object({ phone: phoneSchema, channel: z.nativeEnum(OtpChannel).optional() });

export const otpRequestResultSchema = z.object({ status: z.literal('sent'), channel: z.nativeEnum(OtpChannel), fallbacks: z.array(z.nativeEnum(OtpChannel)), ttlSec: z.number().int() });
export type OtpRequestResult = z.infer<typeof otpRequestResultSchema>;
export type OtpRequest = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{4,6}$/),
  consents: z
    .array(z.object({ type: z.nativeEnum(ConsentType), version: z.string() }))
    .default([]),
  device: z
    .object({ platform: z.enum(['ios', 'android', 'web']), pushToken: z.string().optional() })
    .optional(),
});
export type OtpVerify = z.infer<typeof otpVerifySchema>;

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;
