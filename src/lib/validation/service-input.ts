import { z } from 'zod';

export const uuid = z.string().uuid();
export const questId = uuid;
export const actorId = uuid;
export const entityId = uuid;

export function validate<T>(schema: z.ZodSchema<T>, input: unknown, label: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const err = new Error(`${label}: ${result.error.issues.map(i => i.message).join(', ')}`);
    (err as any).code = 'VALIDATION_ERROR';
    throw err;
  }
  return result.data;
}
