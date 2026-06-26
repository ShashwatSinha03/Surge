import { describe, it, expect } from 'vitest';
import { defineCommand } from '@/features/commands/define';
import { getGroup } from '@/features/commands/groups';

describe('defineCommand', () => {
  it('returns a Command object with all provided fields', () => {
    const cmd = defineCommand({
      id: 'nav:quests',
      title: 'View Quests',
      description: 'Navigate to quests page',
      group: getGroup('navigation'),
      run: () => {},
    });

    expect(cmd.id).toBe('nav:quests');
    expect(cmd.title).toBe('View Quests');
    expect(cmd.description).toBe('Navigate to quests page');
    expect(cmd.group.id).toBe('navigation');
  });

  it('infers keywords from title when not provided', () => {
    const cmd = defineCommand({
      id: 'action:create',
      title: 'Create New Action',
      description: 'Create an action',
      group: getGroup('actions'),
      run: () => {},
    });

    expect(cmd.keywords).toContain('create');
    expect(cmd.keywords).toContain('new');
    expect(cmd.keywords).toContain('action');
  });

  it('filters single-character words from inferred keywords', () => {
    const cmd = defineCommand({
      id: 'test:a',
      title: 'a b c',
      description: 'Single chars',
      group: getGroup('actions'),
      run: () => {},
    });

    expect(cmd.keywords).toEqual([]);
  });

  it('uses provided keywords over inferred', () => {
    const cmd = defineCommand({
      id: 'test:custom',
      title: 'Custom Title',
      description: 'With custom keywords',
      group: getGroup('actions'),
      keywords: ['custom', 'kwd'],
      run: () => {},
    });

    expect(cmd.keywords).toEqual(['custom', 'kwd']);
  });

  it('defaults availability and visible to true', () => {
    const cmd = defineCommand({
      id: 'test:defaults',
      title: 'Defaults',
      description: 'Testing defaults',
      group: getGroup('actions'),
      run: () => {},
    });

    const ctx = {} as any;
    expect(cmd.availability(ctx)).toBe(true);
    expect(cmd.visible(ctx)).toBe(true);
  });

  it('uses custom availability and visible functions', () => {
    const availability = () => false;
    const visible = () => false;

    const cmd = defineCommand({
      id: 'test:custom-fn',
      title: 'Custom Fns',
      description: 'With custom functions',
      group: getGroup('actions'),
      availability,
      visible,
      run: () => {},
    });

    const ctx = {} as any;
    expect(cmd.availability(ctx)).toBe(false);
    expect(cmd.visible(ctx)).toBe(false);
  });
});
