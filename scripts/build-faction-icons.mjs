// Usage: git clone https://github.com/Certseeds/wh40k-icon && node scripts/build-faction-icons.mjs <clone>/src/svgs src/factionIcons.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2];
const OUT = process.argv[3];

const MAP = {
  'Adepta Sororitas': 'human_imperium/adepta-sororitas.svg',
  'Adeptus Custodes': 'human_imperium/adeptus-custodes.svg',
  'Adeptus Mechanicus': 'human_imperium/adeptus-mechanicus.svg',
  'Adeptus Titanicus': 'human_imperium/mechanicum/collegia-titanica.svg',
  'Astra Militarum': 'human_imperium/astra-militarum.svg',
  'Grey Knights': 'human_imperium/astartes_chapters/grey-knights.svg',
  'Imperial Agents': 'human_imperium/inquisition-01.svg',
  'Agents of the Imperium': 'human_imperium/inquisition-01.svg',
  'Imperial Knights': 'human_imperium/imperial-knights.svg',
  'Space Marines': 'human_imperium/adeptus-astartes.svg',
  'Chaos Daemons': 'chaos/chaos-daemons.svg',
  'Daemons': 'chaos/chaos-daemons.svg',
  'Chaos Knights': 'chaos/questor-traitoris.svg',
  'Chaos Space Marines': 'chaos/heretic-astartes.svg',
  'Death Guard': 'chaos/legions/death-guard.svg',
  "Emperor's Children": 'chaos/legions/emperors-children-1.svg',
  'Thousand Sons': 'chaos/legions/thousand-sons.svg',
  'World Eaters': 'chaos/legions/world-eaters-1.svg',
  'Aeldari': 'xenos/eldar/asuryani.svg',
  'Drukhari': 'xenos/durhkari/drukhari-2.svg',
  'Genestealer Cults': 'xenos/genestealer_cult/genestealer-cults.svg',
  'Leagues of Votann': 'xenos/leagues-of-votann.svg',
  'Necrons': 'xenos/necrons/necrons.svg',
  'Orks': 'xenos/orks/orks.svg',
  "T'au Empire": 'xenos/tau_empire/tau-sept.svg',
  'Tyranids': 'xenos/tyranids.svg',
};

const entries = [];
for (const [name, rel] of Object.entries(MAP)) {
  let s = readFileSync(join(SRC, rel), 'utf8');
  s = s.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!DOCTYPE[^>]*>/g, '');
  const vb = s.match(/viewBox="([^"]+)"/)?.[1];
  if (!vb) throw new Error('no viewBox: ' + rel);
  let inner = s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');
  inner = inner.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  // strip hardcoded fills so icons tint via currentColor
  inner = inner.replace(/fill="(?!none)[^"]*"/g, '');
  entries.push({ name, vb, inner });
}

let out = `// Generated from https://github.com/Certseeds/wh40k-icon (symbols © Games Workshop).
// Regenerate with the mapping script if factions change; do not edit by hand.

export interface FactionIconDef {
  viewBox: string;
  /** Inner SVG markup; inherits fill from currentColor. */
  markup: string;
}

export const FACTION_ICONS: Record<string, FactionIconDef> = {
`;
for (const e of entries) {
  out += `  ${JSON.stringify(e.name)}: { viewBox: ${JSON.stringify(e.vb)}, markup: ${JSON.stringify(e.inner)} },\n`;
}
out += `};\n`;
writeFileSync(OUT, out);
console.log('wrote', OUT, entries.length, 'icons', Math.round(out.length / 1024) + 'KB');
