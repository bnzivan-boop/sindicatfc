import { z } from 'zod';

export const idSchema = z.string().uuid();
export const isoDateSchema = z.string().datetime({ offset: true });
/** Телефон в E.164 — единственный логин в MVP. */
export const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, 'Телефон в формате E.164');
/** Деньги — целое число в минимальных единицах (копейки). */
export const moneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().length(3).default('RUB'),
});

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });
