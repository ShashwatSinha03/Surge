import { defineCommand } from '../define';
import { getGroup } from '../groups';
import type { CommandProvider, CommandContext, ExecutionContext } from '../types';
import { ClipboardList, Eye, Edit3, Archive } from 'lucide-react';

function navigate(href: string, ctx: ExecutionContext) {
  window.location.href = href;
  ctx.close();
}

export const questProvider: CommandProvider = {
  getCommands: () => [
    defineCommand({
      id: 'quest:view',
      title: 'View Quest',
      description: 'Open the current quest overview',
      group: getGroup('navigation'),
      keywords: ['open', 'overview', 'details'],
      icon: Eye,
      availability: (ctx: CommandContext) => !!ctx.questId,
      visible: (ctx: CommandContext) => !!ctx.questId,
      run: (ctx) => navigate(`/quests/${ctx.questId}`, ctx),
    }),
    defineCommand({
      id: 'quest:milestones',
      title: 'View Milestones',
      description: 'Open the milestones board',
      group: getGroup('navigation'),
      keywords: ['board', 'tasks', 'actions'],
      icon: ClipboardList,
      availability: (ctx: CommandContext) => !!ctx.questId,
      visible: (ctx: CommandContext) => !!ctx.questId,
      run: (ctx) => navigate(`/quests/${ctx.questId}/milestones`, ctx),
    }),
    defineCommand({
      id: 'quest:mission-control',
      title: 'Mission Control',
      description: 'View quest momentum and recommendations',
      group: getGroup('navigation'),
      keywords: ['momentum', 'health', 'insights', 'analytics'],
      icon: Eye,
      availability: (ctx: CommandContext) => !!ctx.questId,
      visible: (ctx: CommandContext) => !!ctx.questId,
      run: (ctx) => navigate(`/quests/${ctx.questId}/mission-control`, ctx),
    }),
    defineCommand({
      id: 'quest:activity',
      title: 'View Activity',
      description: 'See recent changes and events',
      group: getGroup('navigation'),
      keywords: ['log', 'history', 'changes', 'events'],
      icon: Eye,
      availability: (ctx: CommandContext) => !!ctx.questId,
      visible: (ctx: CommandContext) => !!ctx.questId,
      run: (ctx) => navigate(`/quests/${ctx.questId}/activity`, ctx),
    }),
    defineCommand({
      id: 'quest:team',
      title: 'View Team',
      description: 'See quest members and manage invites',
      group: getGroup('navigation'),
      keywords: ['members', 'people', 'collaborators', 'invite'],
      icon: Eye,
      availability: (ctx: CommandContext) => !!ctx.questId,
      visible: (ctx: CommandContext) => !!ctx.questId,
      run: (ctx) => navigate(`/quests/${ctx.questId}/team`, ctx),
    }),
  ],
};
