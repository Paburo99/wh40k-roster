export const GROUPS = ['Imperium', 'Chaos', 'Xenos', 'Unaligned'];

/** Normalize typographic apostrophes so Wahapedia names match map keys. */
function norm(name: string): string {
  return name.replace(/[’`]/g, "'");
}

const FACTION_GROUPS: Record<string, string> = {
  'Adepta Sororitas': 'Imperium',
  'Adeptus Custodes': 'Imperium',
  'Adeptus Mechanicus': 'Imperium',
  'Adeptus Titanicus': 'Imperium',
  'Astra Militarum': 'Imperium',
  'Grey Knights': 'Imperium',
  'Imperial Agents': 'Imperium',
  'Agents of the Imperium': 'Imperium',
  'Imperial Knights': 'Imperium',
  'Space Marines': 'Imperium',
  'Chaos Daemons': 'Chaos',
  Daemons: 'Chaos',
  'Chaos Knights': 'Chaos',
  'Chaos Space Marines': 'Chaos',
  'Death Guard': 'Chaos',
  "Emperor's Children": 'Chaos',
  'Thousand Sons': 'Chaos',
  'World Eaters': 'Chaos',
  Aeldari: 'Xenos',
  Drukhari: 'Xenos',
  'Genestealer Cults': 'Xenos',
  'Leagues of Votann': 'Xenos',
  Necrons: 'Xenos',
  Orks: 'Xenos',
  "T'au Empire": 'Xenos',
  Tyranids: 'Xenos',
};

/** Accent colors per faction name (from the design's palette; gray fallback). */
const FACTION_COLORS: Record<string, string> = {
  'Adepta Sororitas': '#7d1f1c',
  'Adeptus Custodes': '#8a6a1e',
  'Adeptus Mechanicus': '#8a2e1a',
  'Adeptus Titanicus': '#5a5e66',
  'Astra Militarum': '#4f5a3a',
  'Grey Knights': '#6d7681',
  'Imperial Agents': '#3a4e5c',
  'Agents of the Imperium': '#3a4e5c',
  'Imperial Knights': '#6b5322',
  'Space Marines': '#1f4e79',
  'Chaos Daemons': '#6e1a4a',
  Daemons: '#6e1a4a',
  'Chaos Knights': '#3a2e4a',
  'Chaos Space Marines': '#5e1f24',
  'Death Guard': '#5c6b2e',
  "Emperor's Children": '#7a3a6e',
  'Thousand Sons': '#2a5a7a',
  'World Eaters': '#8c1f1a',
  Aeldari: '#2e6b5c',
  Drukhari: '#2a4a4f',
  'Genestealer Cults': '#5c3a6e',
  'Leagues of Votann': '#6e5a2e',
  Necrons: '#3e6b4a',
  Orks: '#4a6b1e',
  "T'au Empire": '#2e6b7d',
  Tyranids: '#3d2a5c',
  'Unaligned Forces': '#55606b',
};

export function factionColor(name: string): string {
  return FACTION_COLORS[norm(name)] ?? '#55606b';
}

export function factionGroup(name: string): string {
  return FACTION_GROUPS[norm(name)] ?? 'Unaligned';
}

export interface FactionGroup {
  name: string;
  factions: string[];
}

export function groupFactions(factions: string[]): FactionGroup[] {
  const sorted = [...factions].sort((a, b) => a.localeCompare(b));
  return GROUPS.map((g) => ({
    name: g,
    factions: sorted.filter((f) => factionGroup(f) === g),
  })).filter((g) => g.factions.length > 0);
}
