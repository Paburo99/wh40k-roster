import type { Edition, EditionData, RulesData, WUnit } from './types';

const memory = new Map<Edition, EditionData>();
const pending = new Map<Edition, Promise<EditionData>>();
const rulesMemory = new Map<Edition, RulesData>();
const rulesPending = new Map<Edition, Promise<RulesData>>();

/** Load a static edition dataset (built by scripts/build-data.mjs). */
export function loadEdition(ed: Edition): Promise<EditionData> {
  const cached = memory.get(ed);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(ed);
  if (inFlight) return inFlight;
  const p = fetch(`${import.meta.env.BASE_URL}data/${ed}e.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`dataset ${ed}e: HTTP ${res.status}`);
      return res.json() as Promise<EditionData>;
    })
    .then((d) => {
      memory.set(ed, d);
      pending.delete(ed);
      return d;
    })
    .catch((e: unknown) => {
      pending.delete(ed);
      throw e;
    });
  pending.set(ed, p);
  return p;
}

/** Load the full core-rules sections for an edition (built by scripts/build-data.mjs). */
export function loadRules(ed: Edition): Promise<RulesData> {
  const cached = rulesMemory.get(ed);
  if (cached) return Promise.resolve(cached);
  const inFlight = rulesPending.get(ed);
  if (inFlight) return inFlight;
  const p = fetch(`${import.meta.env.BASE_URL}data/rules-${ed}e.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`rules ${ed}e: HTTP ${res.status}`);
      return res.json() as Promise<RulesData>;
    })
    .then((d) => {
      rulesMemory.set(ed, d);
      rulesPending.delete(ed);
      return d;
    })
    .catch((e: unknown) => {
      rulesPending.delete(ed);
      throw e;
    });
  rulesPending.set(ed, p);
  return p;
}

// ---- Derivations ----

const TYPE_KEYWORDS = ['Character', 'Monster', 'Vehicle', 'Mounted', 'Infantry'] as const;
export const UNIT_TYPES: string[] = [...TYPE_KEYWORDS];

/** Design-level unit type derived from datasheet keywords. */
export function unitType(u: WUnit): string {
  for (const t of TYPE_KEYWORDS) if (u.keywords.includes(t)) return t;
  return 'Unit';
}

/** '4' → '4+', numeric range → with inches mark; pass through everything else. */
export function plus(v: string): string {
  return /^\d+$/.test(v) ? v + '+' : v;
}
export function inches(v: string): string {
  return /^\d+$/.test(v) ? v + '"' : v;
}

/**
 * Find the core rule text for a weapon ability name like 'rapid fire 1',
 * 'anti-infantry 4+' or 'melta 2' in the edition's glossary.
 */
export function weaponAbilityRule(data: EditionData, abil: string): { name: string; text: string } | null {
  const key = abil.toUpperCase().replace(/[^A-Z\- ]/g, '').trim();
  let best: { name: string; text: string } | null = null;
  for (const wa of data.weaponAbilities) {
    const gk = wa.name.toUpperCase().replace(/[^A-Z\- ]/g, '').replace(/\bX\b/g, '').trim();
    if (key === gk || key.startsWith(gk + ' ') || (gk.endsWith('-') && key.startsWith(gk)) || (gk === 'ANTI' && key.startsWith('ANTI'))) {
      if (!best || gk.length > best.name.length) best = wa;
    }
  }
  return best;
}

/** Resolve an ability's rules text (inline or shared). */
export function abilityText(data: EditionData, ab: { text?: string; ref?: string }): string {
  if (ab.text) return ab.text;
  if (ab.ref) return data.sharedAbilities[ab.ref] ?? '';
  return '';
}

/** Base name of a weapon — multi-profile weapons ('gun – frag') collapse into one. */
export function weaponBaseName(name: string): string {
  return name.split(' – ')[0].split(' — ')[0].trim();
}

/** Unique weapon names of a unit (multi-profile weapons collapse into one). */
export function weaponChoices(u: WUnit): string[] {
  return [...new Set(u.weapons.map((w) => weaponBaseName(w.name)))];
}

/** A 'replace X with…' wargear option parsed into an exclusive choice group. */
export interface WargearGroup {
  text: string; // the original option wording, shown as reference
  choices: string[]; // weapon base names in the order they appear; [0] is the default being replaced
}

/**
 * Exclusive weapon groups derived from the wargear option texts: weapons named
 * together in a 'replace / instead of' option are alternatives to each other,
 * with the first-mentioned weapon as the default loadout.
 */
export function wargearGroups(u: WUnit): WargearGroup[] {
  const names = weaponChoices(u);
  const groups: WargearGroup[] = [];
  for (const o of u.options) {
    if (!/replac|instead/i.test(o)) continue;
    const low = o.toLowerCase();
    const found = names
      .map((n) => ({ n, idx: low.indexOf(n.toLowerCase()) }))
      .filter((x) => x.idx !== -1)
      .sort((a, b) => a.idx - b.idx)
      .map((x) => x.n);
    if (found.length > 1) groups.push({ text: o, choices: found });
  }
  return groups;
}

/**
 * Selection after tapping `name`: toggles it, and — like the official app —
 * equipping a weapon swaps out the alternatives of every replacement group
 * it belongs to instead of blocking the tap.
 */
export function equipWeapon(u: WUnit, selected: string[], name: string): string[] {
  if (selected.includes(name)) return selected.filter((n) => n !== name);
  let next = selected;
  for (const g of wargearGroups(u)) {
    if (g.choices.includes(name)) next = next.filter((n) => !g.choices.includes(n));
  }
  return [...next, name];
}
