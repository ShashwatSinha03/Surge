import { z } from 'zod';

const roles = ['owner', 'admin', 'member'] as const;

export const updateMemberRoleSchema = z.object({
  role: z.enum(roles),
});

export const memberIdParamSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
