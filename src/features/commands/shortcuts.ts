'use client';

import { useEffect } from 'react';

type ShortcutHandler = (e: KeyboardEvent) => void;

const globalHandlers = new Map<string, ShortcutHandler[]>();

export function registerGlobalShortcut(
  key: string,
  handler: ShortcutHandler,
  metaKey = true,
): () => void {
  const id = metaKey ? `meta+${key}` : key;

  if (!globalHandlers.has(id)) {
    globalHandlers.set(id, []);
  }

  globalHandlers.get(id)!.push(handler);

  return () => {
    const handlers = globalHandlers.get(id);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
      if (handlers.length === 0) globalHandlers.delete(id);
    }
  };
}

function handleKeyDown(e: KeyboardEvent) {
  for (const [id, handlers] of globalHandlers) {
    const [mod, key] = id.startsWith('meta+')
      ? ['meta', id.slice(5)]
      : ['none', id];

    const modMatch =
      mod === 'meta'
        ? e.metaKey || e.ctrlKey
        : true;

    const keyMatch = e.key.toLowerCase() === key.toLowerCase();

    if (modMatch && keyMatch) {
      e.preventDefault();
      e.stopPropagation();
      handlers.forEach((h) => h(e));
      return;
    }
  }
}

let listenerAttached = false;

function ensureListener() {
  if (listenerAttached) return;
  window.addEventListener('keydown', handleKeyDown);
  listenerAttached = true;
}

export function useGlobalShortcuts() {
  useEffect(() => {
    ensureListener();
    return () => {
      if (globalHandlers.size === 0 && listenerAttached) {
        window.removeEventListener('keydown', handleKeyDown);
        listenerAttached = false;
      }
    };
  }, []);
}
