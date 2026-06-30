import { z } from 'zod';

export const createInviteSchema = z.object({
  quest_id: z.string().uuid('Invalid quest ID'),
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .nullable()
    .optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const declineInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type DeclineInviteInput = z.infer<typeof declineInviteSchema>;
