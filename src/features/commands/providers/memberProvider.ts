import { defineCommand } from '../define';
import { getGroup } from '../groups';
import type { CommandProvider, CommandContext } from '../types';
import { UserPlus } from 'lucide-react';

export const memberProvider: CommandProvider = {
  getCommands: () => [],
};
