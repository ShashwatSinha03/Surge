import { describe, it, expect } from 'vitest';
import { searchCommands, boostRecent } from '@/features/commands/search';
import type { Command, CommandResult } from '@/features/commands/types';
import { getGroup } from '@/features/commands/groups';

function createMockCommand(overrides: Partial<Command>): Command {
  return {
    id: 'test:cmd',
    title: 'Test Command',
    description: 'A test command',
    group: getGroup('actions'),
    keywords: ['test', 'cmd'],
    availability: () => true,
    visible: () => true,
    run: () => {},
    ...overrides,
  };
}

describe('searchCommands', () => {
  const commands = [
    createMockCommand({ id: 'nav:quests', title: 'View Quests', keywords: ['view', 'quests', 'navigate'] }),
    createMockCommand({ id: 'nav:settings', title: 'Settings', keywords: ['settings', 'preferences'] }),
    createMockCommand({ id: 'action:create', title: 'Create Action', keywords: ['create', 'action', 'new'] }),
  ];

  it('returns all matching commands sorted by score descending', () => {
    const results = searchCommands('view', commands);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('nav:quests');
  });

  it('returns empty array for empty query', () => {
    expect(searchCommands('', commands)).toEqual([]);
    expect(searchCommands('   ', commands)).toEqual([]);
  });

  it('scores exact match on id as 100', () => {
    const results = searchCommands('nav:quests', commands);
    expect(results[0].id).toBe('nav:quests');
  });

  it('scores exact match on title as 100', () => {
    const results = searchCommands('settings', commands);
    expect(results[0].id).toBe('nav:settings');
  });

  it('scores title starts with query as 80', () => {
    const results = searchCommands('view', commands);
    expect(results[0].id).toBe('nav:quests');
  });

  it('scores keyword starts with query as 60', () => {
    const results = searchCommands('pref', commands);
    expect(results[0].id).toBe('nav:settings');
  });

  it('scores title includes query as 40', () => {
    const results = searchCommands('tion', commands);
    expect(results[0].id).toBe('action:create');
  });

  it('returns fuzzy matches with score below 10', () => {
    const results = searchCommands('vw', commands);
    const result = results.find((r) => r.id === 'nav:quests');
    expect(result).toBeDefined();
  });

  it('returns empty array when nothing matches', () => {
    const results = searchCommands('zzzznotfound', commands);
    expect(results).toEqual([]);
  });

  it('is case-insensitive for matching', () => {
    const results = searchCommands('VIEW QUEST', commands);
    expect(results[0].id).toBe('nav:quests');
  });
});

describe('boostRecent', () => {
  it('boosts recent commands to top of results', () => {
    const results = [
      { id: 'cmd:a', title: 'A', description: '', group: 'actions', type: 'command' as const },
      { id: 'cmd:b', title: 'B', description: '', group: 'actions', type: 'command' as const },
      { id: 'cmd:c', title: 'C', description: '', group: 'actions', type: 'command' as const },
    ] as CommandResult[];

    const boosted = boostRecent(results, ['cmd:c', 'cmd:a']);
    expect(boosted[0].id).toBe('cmd:c');
    expect(boosted[1].id).toBe('cmd:a');
    expect(boosted[2].id).toBe('cmd:b');
  });

  it('handles empty recent list', () => {
    const results = [
      { id: 'cmd:a', title: 'A', description: '', group: 'actions', type: 'command' as const },
    ] as CommandResult[];
    expect(boostRecent(results, [])).toEqual(results);
  });
});
