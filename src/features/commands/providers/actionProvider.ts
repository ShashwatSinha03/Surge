import { defineCommand } from '../define';
import { getGroup } from '../groups';
import type { CommandProvider, CommandContext, ExecutionContext } from '../types';
import { PlusCircle } from 'lucide-react';

function navigate(href: string, ctx: ExecutionContext) {
  window.location.href = href;
  ctx.close();
}

export const actionProvider: CommandProvider = {
  getCommands: () => [
    defineCommand({
      id: 'action:create',
      title: 'Create Action',
      description: 'Add a new action to the current milestone',
      group: getGroup('creation'),
      keywords: ['add', 'new', 'task', 'todo'],
      icon: PlusCircle,
      availability: (ctx: CommandContext) => !!ctx.questId,
      visible: (ctx: CommandContext) => !!ctx.questId,
      run: (ctx) => navigate(`/quests/${ctx.questId}/milestones`, ctx),
    }),
    defineCommand({
      id: 'action:create-milestone',
      title: 'Create Milestone',
      description: 'Add a new milestone to this quest',
      group: getGroup('creation'),
      keywords: ['add', 'new', 'phase', 'stage'],
      icon: PlusCircle,
      availability: (ctx: CommandContext) => !!ctx.questId,
      visible: (ctx: CommandContext) => !!ctx.questId,
      run: (ctx) => navigate(`/quests/${ctx.questId}/milestones`, ctx),
    }),
  ],
};
