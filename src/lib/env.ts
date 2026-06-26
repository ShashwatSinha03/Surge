import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key is required'),
  CLERK_WEBHOOK_SECRET: z.string().min(1, 'Clerk webhook secret is required'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Supabase URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  SUPABASE_DB_HOST: z.string().min(1, 'Database host is required'),
  SUPABASE_DB_PORT: z.coerce.number().int().positive().default(6543),
  SUPABASE_DB_NAME: z.string().min(1, 'Database name is required'),
  SUPABASE_DB_USER: z.string().min(1, 'Database user is required'),
  SUPABASE_DB_PASSWORD: z.string().min(1, 'Database password is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

type Env = z.infer<typeof envSchema>;

let env: Env | null = null;

export function validateEnv(): Env {
  if (env) return env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `  ${i.path.join('.')}: ${i.message}`,
    );
    const message = [
      'Environment validation failed:',
      ...issues,
      '',
      'Check .env.local or environment configuration.',
    ].join('\n');
    throw new Error(message);
  }

  env = result.data;
  return env;
}

export function getEnv(): Env {
  if (!env) {
    return validateEnv();
  }
  return env;
}
