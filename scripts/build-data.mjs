// Builds static datasets for the app from Wahapedia's CSV exports.
// Usage: node scripts/build-data.mjs   → writes public/data/10e.json and 11e.json
//
// Wahapedia exports are pipe-delimited UTF-8 CSVs, one file per table, linked by
// datasheet_id. Weapon-ability rule texts are not in any CSV; they are scraped from
// the core-rules page (abWrap blocks whose names are wrapped in [brackets]).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const EDITIONS = [10, 11];

const CSV_FILES = [
  'Factions',
  'Datasheets',
  'Datasheets_models',
  'Datasheets_models_cost',
  'Datasheets_wargear',
  'Datasheets_options',
  'Datasheets_abilities',
  'Abilities',
  'Datasheets_keywords',
  'Datasheets_unit_composition',
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'tabletop-roster-data-build' } });
  if (!res.ok) throw new Error(`${res.status} on ${url}`);
  return res.text();
}

/**
 * Parse a Wahapedia CSV: header defines column count; a logical row may span
 * physical lines when a description contains a newline, so lines are joined
 * until the expected number of separators is reached. Rows end with a
 * trailing '|'.
 */
function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const header = lines[0].split('|').filter((c) => c !== '');
  const cols = header.length;
  const rows = [];
  let buf = '';
  for (let i = 1; i < lines.length; i++) {
    buf = buf === '' ? lines[i] : buf + '\n' + lines[i];
    if (buf.trim() === '') { buf = ''; continue; }
    const parts = buf.split('|');
    if (parts.length - 1 >= cols) {
      const row = {};
      header.forEach((h, j) => { row[h] = parts[j] ?? ''; });
      rows.push(row);
      buf = '';
    }
  }
  return rows;
}

/** Convert Wahapedia HTML fragments to readable plain text. */
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|ul|ol)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract [WEAPON ABILITY] rule texts from the core-rules page. */
function extractWeaponAbilities(html) {
  const out = [];
  const chunks = html.split('<div class="abWrap');
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const nameM = chunk.match(/<div class="abName">(.*?)<span class="h_number"/s);
    if (!nameM) continue;
    const rawName = htmlToText(nameM[1]).trim();
    if (!rawName.startsWith('[')) continue;
    const name = rawName.replace(/^\[|\]$/g, '').trim();
    // Body: everything after the fluff paragraph (abLegend) if present,
    // otherwise after the name wrapper; cut at the example block if any.
    let body = chunk;
    const legendEnd = body.indexOf('</p>');
    const iconEnd = body.indexOf('abIcon"></div></div>');
    if (body.includes('abLegend') && legendEnd !== -1) body = body.slice(legendEnd + 4);
    else if (iconEnd !== -1) body = body.slice(iconEnd + 20);
    const exampleIdx = body.indexOf('<div class="redExample');
    if (exampleIdx !== -1) body = body.slice(0, exampleIdx);
    // Stop at the trailing spacer divs that separate abilities.
    const spacerIdx = body.indexOf('<div style="height:8px">');
    if (spacerIdx !== -1) body = body.slice(0, spacerIdx);
    const text = htmlToText(body);
    if (text) out.push({ name, text });
  }
  // Dedupe by name, keep first occurrence.
  const seen = new Set();
  return out.filter((a) => (seen.has(a.name) ? false : (seen.add(a.name), true)));
}

/**
 * 10e core-rules page uses <h3>Name</h3> blocks instead of abWrap. A block is a
 * weapon ability if its body references the bracketed keyword form of its own
 * name (e.g. body of "Devastating Wounds" contains "[DEVASTATING WOUNDS").
 */
function extractWeaponAbilities10(html) {
  const out = [];
  const re = /<h3[^>]*>(.*?)<\/h3>/gs;
  const matches = [...html.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const name = htmlToText(matches[i][1]).trim();
    if (!name || name.length > 40) continue;
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : Math.min(start + 4000, html.length);
    let body = html.slice(start, end);
    const h2 = body.indexOf('<h2');
    if (h2 !== -1) body = body.slice(0, h2);
    const marker = '[' + name.toUpperCase().replace(/\s*\bX\b.*$/, '').replace(/-$/, '');
    if (!htmlToText(body).toUpperCase().includes(marker)) continue;
    const exampleIdx = body.indexOf('<div class="redExample');
    if (exampleIdx !== -1) body = body.slice(0, exampleIdx);
    const text = htmlToText(body);
    if (text) out.push({ name: name.toUpperCase(), text });
  }
  const seen = new Set();
  return out.filter((a) => (seen.has(a.name) ? false : (seen.add(a.name), true)));
}

function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

async function buildEdition(ed) {
  const base = `https://wahapedia.ru/wh40k${ed}ed`;
  console.log(`[${ed}e] downloading CSVs…`);
  const csv = {};
  for (const f of CSV_FILES) {
    csv[f] = parseCsv(await fetchText(`${base}/${f}.csv`));
  }
  console.log(`[${ed}e] downloading core rules…`);
  const rulesHtml = await fetchText(`${base}/the-rules/core-rules/`);
  let weaponAbilities = extractWeaponAbilities(rulesHtml);
  if (weaponAbilities.length === 0) weaponAbilities = extractWeaponAbilities10(rulesHtml);
  console.log(`[${ed}e] weapon abilities extracted: ${weaponAbilities.length}`);

  const factionName = new Map(csv.Factions.map((f) => [f.id, f.name]));
  const abilityById = new Map(csv.Abilities.map((a) => [a.id, a]));

  const modelsBy = groupBy(csv.Datasheets_models, 'datasheet_id');
  const costsBy = groupBy(csv.Datasheets_models_cost, 'datasheet_id');
  const wargearBy = groupBy(csv.Datasheets_wargear, 'datasheet_id');
  const optionsBy = groupBy(csv.Datasheets_options, 'datasheet_id');
  const dsAbilBy = groupBy(csv.Datasheets_abilities, 'datasheet_id');
  const keywordsBy = groupBy(csv.Datasheets_keywords, 'datasheet_id');
  const compBy = groupBy(csv.Datasheets_unit_composition, 'datasheet_id');

  const units = [];
  const sharedAbilities = {}; // name → rules text, referenced by unit abilities via `ref`
  for (const ds of csv.Datasheets) {
    if (ds.virtual === 'true' || !ds.name) continue;
    const id = ds.id;

    const models = (modelsBy.get(id) ?? []).map((m) => ({
      name: m.name,
      M: m.M, T: m.T, Sv: m.Sv, inv: m.inv_sv || null,
      W: m.W, Ld: m.Ld, OC: m.OC,
    }));
    if (models.length === 0) continue;

    const costs = (costsBy.get(id) ?? [])
      .map((c) => ({ label: htmlToText(c.description), pts: parseInt(c.cost, 10) || 0 }))
      .filter((c) => c.label);
    if (costs.length === 0) costs.push({ label: '1 model', pts: 0 });

    const weapons = (wargearBy.get(id) ?? []).map((w) => ({
      name: htmlToText(w.name),
      type: w.type === 'Melee' ? 'M' : 'R',
      abils: htmlToText(w.description)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s !== '-'),
      range: w.range,
      A: w.A, skill: w.BS_WS, S: w.S, AP: w.AP, D: w.D,
    }));

    const options = (optionsBy.get(id) ?? [])
      .map((o) => htmlToText(o.description))
      .filter(Boolean);

    const abilities = [];
    for (const a of dsAbilBy.get(id) ?? []) {
      if (a.ability_id && abilityById.has(a.ability_id)) {
        const ref = abilityById.get(a.ability_id);
        const refName = htmlToText(ref.name);
        if (!sharedAbilities[refName]) sharedAbilities[refName] = htmlToText(ref.description);
        abilities.push({
          name: refName + (a.parameter ? ' ' + htmlToText(a.parameter) : ''),
          ref: refName,
          type: a.type || 'Core',
        });
      } else if (a.name) {
        abilities.push({
          name: htmlToText(a.name),
          text: htmlToText(a.description),
          type: a.type || 'Datasheet',
        });
      }
    }

    const kwRows = keywordsBy.get(id) ?? [];
    const keywords = [...new Set(kwRows.filter((k) => k.is_faction_keyword !== 'true').map((k) => k.keyword))];
    const factionKw = [...new Set(kwRows.filter((k) => k.is_faction_keyword === 'true').map((k) => k.keyword))];

    units.push({
      id,
      name: ds.name,
      faction: factionName.get(ds.faction_id) ?? ds.faction_id,
      loadout: htmlToText(ds.loadout),
      transport: htmlToText(ds.transport) || null,
      damagedW: ds.damaged_w || null,
      damagedText: htmlToText(ds.damaged_description) || null,
      models,
      costs,
      weapons,
      options,
      abilities,
      keywords,
      factionKw,
      comp: (compBy.get(id) ?? []).map((c) => htmlToText(c.description)).filter(Boolean),
    });
  }

  units.sort((a, b) => a.faction.localeCompare(b.faction) || a.name.localeCompare(b.name));
  const factions = [...new Set(units.map((u) => u.faction))].sort();

  const payload = { edition: ed, builtAt: new Date().toISOString(), factions, weaponAbilities, sharedAbilities, units };
  await mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `${ed}e.json`);
  await writeFile(outFile, JSON.stringify(payload));
  console.log(`[${ed}e] wrote ${units.length} units, ${factions.length} factions → ${outFile}`);
}

for (const ed of EDITIONS) {
  await buildEdition(ed);
}
