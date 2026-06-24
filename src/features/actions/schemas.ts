import { z } from 'zod';

export const createActionSchema = z.object({
  quest_id: z.string().uuid(),
  milestone_id: z.string().uuid(),
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
});

export const updateActionSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(1000).optional(),
});

export type CreateActionInput = z.infer<typeof createActionSchema>;
export type UpdateActionInput = z.infer<typeof updateActionSchema>;
