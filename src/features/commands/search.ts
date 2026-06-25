import type { Command, CommandResult, SearchResult } from './types';

type RankedItem = {
  result: SearchResult;
  score: number;
};

export function searchCommands(
  query: string,
  commands: Command[],
): CommandResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored: RankedItem[] = [];

  for (const cmd of commands) {
    const title = cmd.title.toLowerCase();
    const id = cmd.id.toLowerCase();

    let score = 0;

    if (id === q || title === q) {
      score = 100;
    } else if (title.startsWith(q)) {
      score = 80;
    } else if (cmd.keywords.some((k) => k.startsWith(q))) {
      score = 60;
    } else if (title.includes(q)) {
      score = 40;
    } else if (cmd.keywords.some((k) => k.includes(q))) {
      score = 20;
    } else {
      const fuzzy = fuzzyScore(q, title);
      if (fuzzy > 0) {
        score = fuzzy;
      }
    }

    if (score > 0) {
      scored.push({
        result: {
          type: 'command',
          id: cmd.id,
          title: cmd.title,
          description: cmd.description,
          group: cmd.group.id,
          shortcut: cmd.shortcut,
        },
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.result as CommandResult);
}

function fuzzyScore(query: string, target: string): number {
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (query[qi] === target[ti]) {
      qi++;
    }
  }
  if (qi === query.length) {
    return 10 - (target.length - query.length) * 0.5;
  }
  return 0;
}

export function boostRecent(
  results: CommandResult[],
  recentIds: string[],
): CommandResult[] {
  const boost = new Map<string, number>();
  recentIds.forEach((id, i) => {
    boost.set(id, (recentIds.length - i) * 5);
  });

  return results
    .map((r) => ({
      result: r,
      score: boost.get(r.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.result);
}
