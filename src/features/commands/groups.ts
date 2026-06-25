import type { CommandGroup, CommandGroupId } from './types';

const GROUPS: Record<CommandGroupId, CommandGroup> = {
  navigation: { id: 'navigation', label: 'Navigation', priority: 10 },
  creation: { id: 'creation', label: 'Create', priority: 20 },
  actions: { id: 'actions', label: 'Actions', priority: 30 },
  quick: { id: 'quick', label: 'Quick', priority: 40 },
};

export function getGroup(id: CommandGroupId): CommandGroup {
  return GROUPS[id];
}
