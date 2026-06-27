'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { commandRegistry } from '@/features/commands/registry';
import { navigationProvider } from '@/features/commands/providers/navigationProvider';
import { questProvider } from '@/features/commands/providers/questProvider';
import { actionProvider } from '@/features/commands/providers/actionProvider';
import { milestoneProvider } from '@/features/commands/providers/milestoneProvider';
import { memberProvider } from '@/features/commands/providers/memberProvider';
import { searchCommands } from '@/features/commands/search';
import { executeCommand } from '@/features/commands/executor';
import { getRecentCommandIds } from '@/features/commands/history';
import { registerGlobalShortcut, useGlobalShortcuts } from '@/features/commands/shortcuts';
import { FocusTrap } from '@/components/ui/focus-trap';
import { SrOnly } from '@/components/ui/sr-only';

import type { Command, CommandContext, ExecutionContext, SearchResult } from '@/features/commands/types';

const MIN_QUERY_LENGTH = 2;

commandRegistry.register(navigationProvider);
commandRegistry.register(questProvider);
commandRegistry.register(actionProvider);
commandRegistry.register(milestoneProvider);
commandRegistry.register(memberProvider);

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [serverResults, setServerResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  const context: CommandContext = useMemo(() => {
    const match = pathname.match(/^\/quests\/([^/]+)/);
    return {
      pathname,
      questId: match?.[1],
    };
  }, [pathname]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setServerResults([]);
    setSelectedIndex(0);
    previousFocusRef.current?.focus();
  }, []);

  const open = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsOpen(true);
    setQuery('');
    setServerResults([]);
    setSelectedIndex(0);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, close, open]);

  useEffect(() => {
    registerGlobalShortcut('k', () => toggle());
  }, [toggle]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  const availableCommands = useMemo(
    () => commandRegistry.getVisible(context),
    [context],
  );

  const recentCommandIds = useMemo(() => {
    if (!isOpen) return [];
    return getRecentCommandIds();
  }, [isOpen]);

  const recentCommands = useMemo(() => {
    if (query) return [];
    return recentCommandIds
      .map((id) => availableCommands.find((c) => c.id === id))
      .filter((c): c is Command => !!c);
  }, [query, recentCommandIds, availableCommands]);

  const commandResults = useMemo(() => {
    if (!query) return [];
    return searchCommands(query, availableCommands);
  }, [query, availableCommands]);

  useEffect(() => {
    if (!query || query.length < MIN_QUERY_LENGTH) {
      setServerResults([]);
      return;
    }

    setIsSearching(true);

    const params = new URLSearchParams({ q: query });
    if (context.questId) params.set('questId', context.questId);

    fetch(`/api/search?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setServerResults(data.results ?? []);
      })
      .catch(() => {
        setServerResults([]);
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, [query, context.questId]);

  const allResults = useMemo(() => {
    const combined: { type: 'command' | 'result'; item: Command | SearchResult }[] = [];

    const commands = commandResults.map((r) => ({
      type: 'command' as const,
      item: r as SearchResult,
    }));

    const entities = serverResults.map((r) => ({
      type: 'result' as const,
      item: r,
    }));

    if (query) {
      combined.push(...commands, ...entities);
    }

    return combined;
  }, [commandResults, serverResults, query]);

  const totalItems = query ? allResults.length : recentCommands.length;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(totalItems, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSelectedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setSelectedIndex(Math.max(totalItems - 1, 0));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 5, 0));
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 5, Math.max(totalItems - 1, 0)));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelected();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [totalItems, close],
  );

  function executeSelected() {
    if (query && commandResults.length > 0) {
      const commandId = commandResults[selectedIndex]?.id;
      const command = availableCommands.find((c) => c.id === commandId);
      if (command) {
        executeCommand(command, {
          ...context,
          close: () => setIsOpen(false),
        });
        return;
      }
    }

    const entityList = query ? serverResults : [];
    const entityItem = entityList[query ? selectedIndex - commandResults.length : selectedIndex];

    if (entityItem) {
      handleEntitySelect(entityItem);
      return;
    }

    if (!query && recentCommands[selectedIndex]) {
      const cmd = recentCommands[selectedIndex];
      executeCommand(cmd, {
        ...context,
        close: () => setIsOpen(false),
      });
    }
  }

  function handleEntitySelect(result: SearchResult) {
    switch (result.type) {
      case 'navigation':
        router.push(result.href);
        close();
        break;
      case 'quest':
        router.push(`/quests/${result.id}`);
        close();
        break;
      case 'action':
        router.push(`/quests/${result.questId}/milestones`);
        close();
        break;
      case 'milestone':
        router.push(`/quests/${result.questId}/milestones`);
        close();
        break;
      case 'member':
        router.push(`/quests/${result.questId}/team`);
        close();
        break;
    }
  }

  function handleItemClick(index: number) {
    setSelectedIndex(index);
    executeSelected();
  }

  function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
    if (!highlight || highlight.length < MIN_QUERY_LENGTH) {
      return <>{text}</>;
    }
    const lower = text.toLowerCase();
    const hl = highlight.toLowerCase();
    const idx = lower.indexOf(hl);
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-accent/20 text-accent rounded-sm">{text.slice(idx, idx + hl.length)}</mark>
        {text.slice(idx + hl.length)}
      </>
    );
  }

  function renderItem(
    item: SearchResult | Command,
    index: number,
  ): { key: string; element: React.ReactNode } {
    const isSelected = index === selectedIndex;
    const baseClass = 'flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors';
    const selectedClass = isSelected ? 'bg-surface-alt' : 'hover:bg-surface';
    const itemId = `command-item-${index}`;

    if ('type' in item && item.type === 'command' && !('description' in item && 'group' in item)) {
      const cmd = item as Command;
      return {
        key: cmd.id,
        element: (
          <div
            key={cmd.id}
            id={itemId}
            className={`${baseClass} ${selectedClass}`}
            onClick={() => handleItemClick(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            role="option"
            aria-selected={isSelected}
          >
            {cmd.icon && <cmd.icon className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-fg truncate">
                <HighlightedText text={cmd.title} highlight={query} />
              </div>
              <div className="text-xs text-muted truncate">
                <HighlightedText text={cmd.description} highlight={query} />
              </div>
            </div>
            {cmd.shortcut && (
              <kbd className="text-[10px] text-muted bg-surface px-1.5 py-0.5 rounded border border-border font-secondary">
                {cmd.shortcut}
              </kbd>
            )}
          </div>
        ),
      };
    }

    if ('type' in item) {
      const r = item as SearchResult;
      const displayTitle = 'title' in r ? (r as any).title : (r as any).name;
      return {
        key: `${r.type}:${(r as any).id}`,
        element: (
          <div
            key={`${r.type}:${(r as any).id}`}
            id={itemId}
            className={`${baseClass} ${selectedClass}`}
            onClick={() => handleItemClick(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            role="option"
            aria-selected={isSelected}
          >
            <TypeIcon type={r.type} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-fg truncate">
                <HighlightedText text={displayTitle} highlight={query} />
              </div>
              <div className="text-xs text-muted truncate">
                <TypeLabel type={r.type} result={r} />
              </div>
            </div>
          </div>
        ),
      };
    }

    const cmd = item as Command;
    return {
      key: cmd.id,
      element: (
        <div
          key={cmd.id}
          id={itemId}
          className={`${baseClass} ${selectedClass}`}
          onClick={() => handleItemClick(index)}
          onMouseEnter={() => setSelectedIndex(index)}
          role="option"
          aria-selected={isSelected}
        >
          {cmd.icon && <cmd.icon className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-fg truncate">
              <HighlightedText text={cmd.title} highlight={query} />
            </div>
            <div className="text-xs text-muted truncate">
              <HighlightedText text={cmd.description} highlight={query} />
            </div>
          </div>
          {cmd.shortcut && (
            <kbd className="text-[10px] text-muted bg-surface px-1.5 py-0.5 rounded border border-border font-secondary">
              {cmd.shortcut}
            </kbd>
          )}
        </div>
      ),
    };
  }

  if (!isOpen) return null;

  const showRecent = !query && recentCommands.length > 0;
  const showCommands = query && commandResults.length > 0;
  const showResults = query && serverResults.length > 0;
  const showEmpty = query && !isSearching && !showCommands && !showResults;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="fixed inset-0 bg-black/60" onClick={close} aria-hidden="true" />
      <FocusTrap active={isOpen}>
        <div
          ref={listRef}
          className="relative w-full max-w-lg bg-bg border border-border rounded-xl shadow-2xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search commands and work items..."
              className="flex-1 bg-transparent text-sm text-fg placeholder:text-muted/50 focus:outline-none"
              aria-label="Search commands"
              aria-activedescendant={totalItems > 0 ? `command-item-${selectedIndex}` : undefined}
              role="combobox"
              aria-expanded="true"
              aria-controls="command-results"
              autoComplete="off"
            />
            {isSearching && (
              <span className="text-xs text-muted animate-pulse" aria-live="polite">Searching...</span>
            )}
            {!isSearching && query && totalItems > 0 && (
              <span className="text-xs text-muted/40">{totalItems} result{totalItems !== 1 ? 's' : ''}</span>
            )}
          </div>

          <SrOnly role="status" aria-live="polite">
            {totalItems > 0
              ? `${totalItems} result${totalItems !== 1 ? 's' : ''}. ${selectedIndex + 1} of ${totalItems} selected.`
              : 'No results.'}
          </SrOnly>

          <div
            id="command-results"
            className="max-h-80 overflow-y-auto"
            role="listbox"
            aria-label="Results"
          >
            {showRecent && (
              <div>
                <div className="px-4 py-2 text-[10px] font-secondary uppercase tracking-widest text-muted/60">
                  Recent
                </div>
                {recentCommands.map((cmd, i) => {
                  const { element } = renderItem(cmd, i);
                  return element;
                })}
              </div>
            )}

            {showCommands && (
              <div>
                <div className="px-4 py-2 text-[10px] font-secondary uppercase tracking-widest text-muted/60">
                  Commands
                </div>
                {commandResults.map((cmdResult, i) => {
                  const cmd = availableCommands.find((c) => c.id === cmdResult.id);
                  if (!cmd) return null;
                  const { element } = renderItem(cmd, i);
                  return element;
                })}
              </div>
            )}

            {showResults && (
              <div>
                <div className="px-4 py-2 text-[10px] font-secondary uppercase tracking-widest text-muted/60">
                  Results
                </div>
                {serverResults.map((result, i) => {
                  const { element } = renderItem(
                    result,
                    commandResults.length + i,
                  );
                  return element;
                })}
              </div>
            )}

            {showEmpty && (
              <div className="px-4 py-8 text-center" aria-live="polite">
                <p className="text-sm text-muted">No matching commands or work items.</p>
              </div>
            )}

            {!showRecent && !showCommands && !showResults && !showEmpty && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted/40">Type to search commands and work items.</p>
              </div>
            )}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const className = 'w-4 h-4 text-muted shrink-0';
  switch (type) {
    case 'quest':
      return <span className={`${className} text-status-healthy`} aria-hidden="true">Q</span>;
    case 'action':
      return <span className={`${className} text-status-claimed`} aria-hidden="true">A</span>;
    case 'milestone':
      return <span className={`${className} text-status-attention`} aria-hidden="true">M</span>;
    case 'member':
      return <span className={`${className} text-status-healthy`} aria-hidden="true">@</span>;
    default:
      return <span className={className} aria-hidden="true">\u2022</span>;
  }
}

function TypeLabel({ type, result }: { type: string; result: SearchResult }) {
  switch (type) {
    case 'quest': {
      const r = result as any;
      return <>{r.status} &middot; {r.templateType}</>;
    }
    case 'action': {
      const r = result as any;
      return <>{r.status}{r.milestoneTitle ? ` in ${r.milestoneTitle}` : ''}</>;
    }
    case 'milestone': {
      const r = result as any;
      return <>{r.status}</>;
    }
    case 'member': {
      const r = result as any;
      return <>{r.email} &middot; {r.role}</>;
    }
    case 'navigation': {
      const r = result as any;
      return <>{r.href}</>;
    }
    default:
      return null;
  }
}
