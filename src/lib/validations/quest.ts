import { z } from 'zod';

const templateTypes = [
  'saas',
  'hackathon',
  'portfolio',
  'mobile_app',
  'open_source',
  'custom',
] as const;

export const createQuestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be 100 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  template_type: z.enum(templateTypes, 'Please select a valid template'),
});
