import type { Command, CommandContext, CommandProvider } from './types';

function createRegistry() {
  const providers: CommandProvider[] = [];

  function register(provider: CommandProvider) {
    providers.push(provider);
  }

  function getCommands(ctx: CommandContext): Command[] {
    const seen = new Set<string>();
    const result: Command[] = [];

    for (const provider of providers) {
      for (const cmd of provider.getCommands(ctx)) {
        if (!seen.has(cmd.id)) {
          seen.add(cmd.id);
          result.push(cmd);
        }
      }
    }

    return result;
  }

  function getAvailable(ctx: CommandContext): Command[] {
    return getCommands(ctx).filter((cmd) => cmd.availability(ctx));
  }

  function getVisible(ctx: CommandContext): Command[] {
    return getAvailable(ctx).filter((cmd) => cmd.visible(ctx));
  }

  return { register, getCommands, getAvailable, getVisible };
}

export const commandRegistry = createRegistry();
