import { z } from 'zod';
import { InvitationStatus, MemberRole, PaymentStatus, RegistrationStatus } from '../enums/registration.js';
import { ParticipationFormat } from '../enums/tournament.js';
import { idSchema, isoDateSchema, moneySchema, phoneSchema } from './common.js';

export const createRegistrationSchema = z.object({
  format: z.nativeEnum(ParticipationFormat),
  /** Комплект из арсенала, с которым участник выходит на старт (опционально). */
  gearKitId: idSchema.optional(),
  boatId: idSchema.optional(),
});
export type CreateRegistration = z.infer<typeof createRegistrationSchema>;

export const inviteMemberSchema = z
  .object({ userId: idSchema.optional(), phone: phoneSchema.optional() })
  .refine((v) => v.userId || v.phone, { message: 'Нужен userId или phone' });
export type InviteMember = z.infer<typeof inviteMemberSchema>;

export const registrationSchema = z.object({
  id: idSchema,
  tournamentId: idSchema,
  ownerId: idSchema,
  format: z.nativeEnum(ParticipationFormat),
  status: z.nativeEnum(RegistrationStatus),
  amount: moneySchema.nullable(),
  startNumber: z.string().nullable(),
  members: z.array(
    z.object({
      userId: idSchema.nullable(),
      displayName: z.string().nullable(),
      role: z.nativeEnum(MemberRole),
      invitationStatus: z.nativeEnum(InvitationStatus),
    }),
  ),
  payment: z
    .object({ status: z.nativeEnum(PaymentStatus), paidAt: isoDateSchema.nullable() })
    .nullable(),
  createdAt: isoDateSchema,
});
export type Registration = z.infer<typeof registrationSchema>;
