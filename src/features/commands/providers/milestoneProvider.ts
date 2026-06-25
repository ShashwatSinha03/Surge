import { defineCommand } from '../define';
import { getGroup } from '../groups';
import type { CommandProvider, CommandContext } from '../types';
import { ListPlus } from 'lucide-react';

export const milestoneProvider: CommandProvider = {
  getCommands: () => [],
};
