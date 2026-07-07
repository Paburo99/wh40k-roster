import type { Army, Player, WUnit } from './types';

const STORAGE_KEY = 'ttr-players-v4';

export function loadPlayers(): Player[] {
  try {
    // Drop the pre-Wahapedia dataset cache and roster (incompatible unit ids).
    localStorage.removeItem('ttr-openhammer-cache-v1');
    localStorage.removeItem('ttr-players-v3');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Player[];
  } catch {
    // corrupted storage — start fresh
  }
  return [];
}

export function savePlayers(players: Player[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch {
    // quota exceeded — keep working in memory
  }
}

export function uid(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 999).toString(36);
}

export function armyTotal(army: Army, unitById: Map<string, WUnit>): number {
  return army.entries.reduce((sum, e) => {
    const u = unitById.get(e.unitId);
    if (!u) return sum;
    const b = u.costs[Math.min(e.sizeIdx, u.costs.length - 1)];
    return sum + b.pts * e.qty;
  }, 0);
}

export function buildExport(army: Army, unitById: Map<string, WUnit>): string {
  const total = armyTotal(army, unitById);
  const lines: string[] = [];
  lines.push('════ ' + army.name.toUpperCase() + ' ════');
  lines.push(army.faction + ' — ' + army.edition + 'th Edition');
  lines.push(total + ' / ' + army.limit + ' pts' + (total > army.limit ? '  ⚠ OVER LIMIT' : ''));
  lines.push('');
  army.entries.forEach((e) => {
    const u = unitById.get(e.unitId);
    if (!u) return;
    const b = u.costs[Math.min(e.sizeIdx, u.costs.length - 1)];
    lines.push((e.qty > 1 ? e.qty + '× ' : '') + u.name + ' (' + b.label + ') — ' + b.pts * e.qty + ' pts');
    if (e.weapons?.length) lines.push('   ⚔ ' + e.weapons.join(', '));
    if (e.notes) lines.push('   › ' + e.notes);
  });
  if (army.notes) {
    lines.push('');
    lines.push('Notes: ' + army.notes);
  }
  lines.push('');
  lines.push('— exported from Tabletop Roster —');
  return lines.join('\n');
}
