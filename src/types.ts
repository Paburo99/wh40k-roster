// ---- Dataset shapes (produced by scripts/build-data.mjs from Wahapedia exports) ----

export interface WModel {
  name: string;
  M: string;
  T: string;
  Sv: string;
  inv: string | null; // '-' or null when none
  W: string;
  Ld: string;
  OC: string;
}

export interface WWeapon {
  name: string;
  type: 'R' | 'M'; // ranged | melee
  abils: string[]; // weapon ability names, e.g. 'rapid fire 1'
  range: string;
  A: string;
  skill: string; // BS or WS
  S: string;
  AP: string;
  D: string;
}

export interface WAbility {
  name: string;
  type: string; // 'Core' | 'Faction' | 'Datasheet' | ...
  text?: string; // inline rules text (datasheet abilities)
  ref?: string; // key into EditionData.sharedAbilities (core/faction abilities)
}

export interface WUnit {
  id: string;
  name: string;
  faction: string;
  loadout: string;
  transport: string | null;
  damagedW: string | null;
  damagedText: string | null;
  models: WModel[];
  costs: PointsBracket[];
  weapons: WWeapon[];
  options: string[]; // wargear option texts
  abilities: WAbility[];
  keywords: string[];
  factionKw: string[];
  comp: string[]; // unit composition lines
}

export interface EditionData {
  edition: number;
  builtAt: string;
  factions: string[];
  weaponAbilities: { name: string; text: string }[];
  sharedAbilities: Record<string, string>;
  units: WUnit[];
}

export interface RuleSection {
  level: number; // 2 = chapter heading, 3 = sub-section
  title: string;
  text: string;
  src: string; // source document, e.g. 'Core Rules', 'FAQs', 'Abilities'
}

export interface RulesData {
  edition: number;
  builtAt: string;
  sections: RuleSection[];
}

export type Edition = 10 | 11;

// ---- App domain ----

/** A selectable size/points bracket. */
export interface PointsBracket {
  label: string; // e.g. '10 models'
  pts: number;
}

export interface RosterEntry {
  id: string;
  unitId: string;
  sizeIdx: number;
  qty: number;
  notes: string;
  weapons: string[]; // selected weapon names from the unit's wargear list
}

export interface Army {
  id: string;
  name: string;
  faction: string;
  edition: Edition;
  limit: number;
  notes: string;
  entries: RosterEntry[];
}

export interface Player {
  id: string;
  name: string;
  armies: Army[];
}
