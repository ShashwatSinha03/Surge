import { validateEnv } from '@/lib/env';

let bootstrapped = false;

export function bootstrap(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  validateEnv();
}
