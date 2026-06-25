import type { HistoryEntry } from './types';

const STORAGE_KEY = 'surge-command-history';
const MAX_ENTRIES = 10;

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

export function addToHistory(entry: HistoryEntry): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getHistory();
    const filtered = history.filter((h) => h.commandId !== entry.commandId);
    filtered.unshift(entry);
    filtered.splice(MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    /* noop */
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export function getRecentCommandIds(): string[] {
  return getHistory().map((h) => h.commandId);
}
