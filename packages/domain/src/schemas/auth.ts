import { z } from 'zod';
import { ConsentType } from '../enums/user.js';
import { phoneSchema } from './common.js';

export const otpRequestSchema = z.object({ phone: phoneSchema });
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
