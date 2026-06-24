import { z } from 'zod';

export const createMilestoneSchema = z.object({
  quest_id: z.string().uuid(),
  title: z.string().min(3).max(100),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  position: z.number().int().positive().optional(),
});

export const deleteMilestoneSchema = z.object({
  force: z.boolean().optional(),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
