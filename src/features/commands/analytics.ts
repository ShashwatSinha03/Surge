import type { HistoryEntry } from './types';

const STORAGE_KEY = 'surge-command-analytics';

export type AnalyticsEntry = HistoryEntry & {
  executionDuration: number;
};

export function getAnalytics(): AnalyticsEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalyticsEntry[];
    return Array.isArray(parsed) ? parsed.slice(-50) : [];
  } catch {
    return [];
  }
}

export function trackExecution(entry: AnalyticsEntry): void {
  if (typeof window === 'undefined') return;

  try {
    const analytics = getAnalytics();
    analytics.push(entry);
    analytics.splice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analytics));
  } catch {
    /* noop */
  }
}
