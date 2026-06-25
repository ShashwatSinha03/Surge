import type { Command, CommandContext, CommandGroup, ExecutionContext } from './types';

type DefineCommandConfig = {
  id: string;
  title: string;
  description: string;
  group: CommandGroup;
  keywords?: string[];
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  availability?: (ctx: CommandContext) => boolean;
  visible?: (ctx: CommandContext) => boolean;
  run: (ctx: ExecutionContext) => void | Promise<void>;
};

export function defineCommand(config: DefineCommandConfig): Command {
  const keywords = config.keywords ?? inferKeywords(config.title);

  return {
    id: config.id,
    title: config.title,
    description: config.description,
    group: config.group,
    keywords,
    shortcut: config.shortcut,
    icon: config.icon,
    availability: config.availability ?? (() => true),
    visible: config.visible ?? (() => true),
    run: config.run,
  };
}

function inferKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
}
