import type { Command, ExecutionContext } from './types';
import { addToHistory } from './history';
import { trackExecution } from './analytics';

export async function executeCommand(
  command: Command,
  context: ExecutionContext,
): Promise<void> {
  const start = performance.now();
  let success = false;

  try {
    await command.run(context);
    success = true;
  } catch (err) {
    console.error(`Command failed: ${command.id}`, err);
    success = false;
  }

  const duration = performance.now() - start;

  trackExecution({
    commandId: command.id,
    timestamp: Date.now(),
    executionDuration: Math.round(duration),
    success,
  });

  if (success) {
    addToHistory({ commandId: command.id, timestamp: Date.now(), success: true });
  }
}
