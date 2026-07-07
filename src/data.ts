import type { Edition, EditionData, WUnit } from './types';

const memory = new Map<Edition, EditionData>();
const pending = new Map<Edition, Promise<EditionData>>();

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

/** Unique weapon names of a unit (multi-profile weapons collapse into one). */
export function weaponChoices(u: WUnit): string[] {
  const names = u.weapons.map((w) => w.name.split(' – ')[0].split(' — ')[0].trim());
  return [...new Set(names)];
}
