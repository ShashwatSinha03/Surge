import { defineCommand } from '../define';
import { getGroup } from '../groups';
import type { CommandProvider, CommandContext, ExecutionContext } from '../types';
import { Home, Plus, Settings } from 'lucide-react';

function navigate(href: string, ctx: ExecutionContext) {
  window.location.href = href;
  ctx.close();
}

export const navigationProvider: CommandProvider = {
  getCommands: () => [
    defineCommand({
      id: 'navigate:quests',
      title: 'Go to Quests',
      description: 'View all your quests',
      group: getGroup('navigation'),
      keywords: ['home', 'all', 'list'],
      icon: Home,
      run: (ctx) => navigate('/quests', ctx),
    }),
    defineCommand({
      id: 'navigate:new-quest',
      title: 'New Quest',
      description: 'Create a new quest',
      group: getGroup('navigation'),
      keywords: ['create', 'start'],
      icon: Plus,
      run: (ctx) => navigate('/quests/new', ctx),
    }),
    defineCommand({
      id: 'navigate:settings',
      title: 'Settings',
      description: 'Configure your account',
      group: getGroup('navigation'),
      keywords: ['preferences', 'config'],
      icon: Settings,
      run: (ctx) => navigate('/settings', ctx),
    }),
  ],
};
