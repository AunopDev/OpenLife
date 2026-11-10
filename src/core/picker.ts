/* OpenLife — cross-run event memory + picker */
const KEY = 'openlife.seenEvents.v1';
let seen: Record<string, number> = {};

try {
  seen = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
} catch (e) {
  seen = {};
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch (e) {
    /* ignore */
  }
}

export function markSeen(title: string): void {
  seen[title] = (seen[title] || 0) + 1;
  persist();
}

export function pickSeenEvent(pool: any[], history: string[], lastTitle: string): any {
  let candidates = pool.filter(function (e) { return history.indexOf(e.title) < 0; });
  if (!candidates.length) candidates = pool;

  let min = Infinity;
  candidates.forEach(function (e) {
    const n = seen[e.title] || 0;
    if (n < min) min = n;
  });
  const best = candidates.filter(function (e) { return (seen[e.title] || 0) === min; });

  let ev = best[0];
  let total = 0;
  best.forEach(function (e) { total += Math.max(0.1, Number(e.weight) || 1); });
  let roll = Math.random() * total;
  for (let i = 0; i < best.length; i += 1) {
    roll -= Math.max(0.1, Number(best[i].weight) || 1);
    if (roll <= 0) { ev = best[i]; break; }
  }
  if (best.length > 1 && ev.title === lastTitle) {
    ev = best[(best.indexOf(ev) + 1) % best.length];
  }
  markSeen(ev.title);
  return ev;
}

export function resetSeenMemory(): void {
  seen = {};
  persist();
}

export function seenCount(): number {
  return Object.keys(seen).length;
}
