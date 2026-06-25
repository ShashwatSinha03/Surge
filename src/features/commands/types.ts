import type { MemberRole } from '@/types';

export type CommandGroupId = 'navigation' | 'creation' | 'actions' | 'quick';

export type CommandGroup = {
  id: CommandGroupId;
  label: string;
  priority: number;
};

export type CommandContext = {
  pathname: string;
  questId?: string;
  questTitle?: string;
  role?: MemberRole;
  userId?: string;
};

export type Command = {
  id: string;
  title: string;
  description: string;
  group: CommandGroup;
  keywords: string[];
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  availability: (ctx: CommandContext) => boolean;
  visible: (ctx: CommandContext) => boolean;
  run: (ctx: ExecutionContext) => void | Promise<void>;
};

export type ExecutionContext = CommandContext & {
  close: () => void;
};

export type NavigationResult = {
  type: 'navigation';
  id: string;
  title: string;
  description: string;
  href: string;
};

export type QuestResult = {
  type: 'quest';
  id: string;
  title: string;
  status: string;
  templateType: string;
};

export type ActionResult = {
  type: 'action';
  id: string;
  title: string;
  status: string;
  milestoneTitle?: string;
  questId: string;
};

export type MilestoneResult = {
  type: 'milestone';
  id: string;
  title: string;
  status: string;
  questId: string;
};

export type MemberResult = {
  type: 'member';
  id: string;
  name: string;
  email: string;
  role: string;
  questId: string;
};

export type CommandResult = {
  type: 'command';
  id: string;
  title: string;
  description: string;
  group: string;
  shortcut?: string;
};

export type SearchResult = NavigationResult | QuestResult | ActionResult | MilestoneResult | MemberResult | CommandResult;

export type HistoryEntry = {
  commandId: string;
  timestamp: number;
  success: boolean;
};

export type CommandProvider = {
  getCommands: (ctx: CommandContext) => Command[];
};

export type SearchProviderResult = {
  results: SearchResult[];
};

export type SearchProvider = {
  search: (query: string, context: CommandContext) => Promise<SearchResult[]>;
};
