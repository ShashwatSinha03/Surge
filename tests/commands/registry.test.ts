import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Command, CommandContext, CommandProvider } from '@/features/commands/types';
import { getGroup } from '@/features/commands/groups';

function createProvider(name: string, commands: Command[]): CommandProvider {
  return {
    getCommands: () => commands,
  };
}

function createMockCommand(id: string, title: string, overrides: Partial<Command> = {}): Command {
  return {
    id,
    title,
    description: `Description for ${title}`,
    group: getGroup('actions'),
    keywords: [title.toLowerCase()],
    availability: () => true,
    visible: () => true,
    run: () => {},
    ...overrides,
  };
}

const mockCtx = {} as CommandContext;

async function freshRegistry() {
  vi.resetModules();
  return import('@/features/commands/registry');
}

describe('commandRegistry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns commands from all registered providers', async () => {
    const { commandRegistry } = await freshRegistry();

    const p1 = createProvider('p1', [
      createMockCommand('cmd:a', 'Command A'),
      createMockCommand('cmd:b', 'Command B'),
    ]);
    const p2 = createProvider('p2', [
      createMockCommand('cmd:c', 'Command C'),
    ]);

    commandRegistry.register(p1);
    commandRegistry.register(p2);

    const cmds = commandRegistry.getCommands(mockCtx);
    expect(cmds).toHaveLength(3);
    expect(cmds.map((c) => c.id).sort()).toEqual(['cmd:a', 'cmd:b', 'cmd:c']);
  });

  it('deduplicates commands by id', async () => {
    const { commandRegistry } = await freshRegistry();

    const p1 = createProvider('p1', [
      createMockCommand('cmd:a', 'Command A'),
    ]);
    const p2 = createProvider('p2', [
      createMockCommand('cmd:a', 'Command A Duplicate'),
    ]);

    commandRegistry.register(p1);
    commandRegistry.register(p2);

    const cmds = commandRegistry.getCommands(mockCtx);
    expect(cmds).toHaveLength(1);
    expect(cmds[0].id).toBe('cmd:a');
  });

  it('getAvailable filters by availability', async () => {
    const { commandRegistry } = await freshRegistry();

    const p1 = createProvider('p1', [
      createMockCommand('cmd:available', 'Available', { availability: () => true }),
      createMockCommand('cmd:unavailable', 'Unavailable', { availability: () => false }),
    ]);

    commandRegistry.register(p1);
    const available = commandRegistry.getAvailable(mockCtx);
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('cmd:available');
  });

  it('getVisible filters by visibility', async () => {
    const { commandRegistry } = await freshRegistry();

    const p1 = createProvider('p1', [
      createMockCommand('cmd:visible', 'Visible', { visible: () => true, availability: () => true }),
      createMockCommand('cmd:hidden', 'Hidden', { visible: () => false, availability: () => true }),
    ]);

    commandRegistry.register(p1);
    const visible = commandRegistry.getVisible(mockCtx);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('cmd:visible');
  });

  it('getVisible only includes available commands', async () => {
    const { commandRegistry } = await freshRegistry();

    const p1 = createProvider('p1', [
      createMockCommand('cmd:visible', 'Visible', { visible: () => true, availability: () => true }),
      createMockCommand('cmd:unavail', 'Unavailable', { visible: () => true, availability: () => false }),
    ]);

    commandRegistry.register(p1);
    const visible = commandRegistry.getVisible(mockCtx);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('cmd:visible');
  });
});
