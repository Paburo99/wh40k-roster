# Tabletop Roster

Mobile-first web app for browsing Warhammer 40k datasheets (10th **and 11th** edition) and
building point-limited army rosters per player. Implements the Claude Design handoff in
`../design-handoff/`.

## Run

```
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # production build in dist/
npm run data     # refresh public/data/10e.json + 11e.json from Wahapedia exports
```

## Features

- **Datasheets tab** — 10th/11th edition toggle, search, faction filter (grouped
  Imperium/Chaos/Xenos/Unaligned), type chips (derived from keywords), card/row view.
- **Datasheet detail** — statline per model profile, ranged/melee weapon tables with
  **tappable weapon abilities that expand the core-rules text** (e.g. Lethal Hits,
  Rapid Fire X), full ability rules (datasheet, faction and core), **wargear options**,
  unit composition + default loadout, transport, damaged profile, keywords, points.
- **Army Builder tab** — players → armies (per edition) → roster. Point limit with
  progress bar and over-limit warning, size brackets and quantity per entry,
  **weapon selection chips per entry** (with the unit's wargear option text as reference),
  per-entry and per-army notes, duplicate, plain-text export (includes chosen weapons),
  two-tap delete.

## Data

Data is snapshotted from [Wahapedia](https://wahapedia.ru)'s CSV exports
(`wh40k10ed` / `wh40k11ed`) by `scripts/build-data.mjs` into static JSON under
`public/data/` (~3.5 MB per edition, lazy-loaded per edition at runtime):

- Datasheets, model profiles, points brackets, weapon profiles with abilities,
  wargear option texts, datasheet/faction/core ability rule texts, keywords, composition.
- Weapon-ability rule texts (Lethal Hits, Melta X, …) are scraped from each edition's
  core-rules page; the two editions have different markup, handled by two extractors.
- Run `npm run data` whenever Wahapedia updates (new codexes, points changes).

The first iteration used the [OpenHammer API](https://github.com/EshanPrakash/openhammer-api),
which was replaced because it only covers 10th edition and lacks wargear options and
rule texts.

Rosters persist in `localStorage` under `ttr-players-v4`.

## Structure

- `scripts/build-data.mjs` — Wahapedia CSV → JSON pipeline (run with `npm run data`)
- `src/data.ts` — dataset loader + derivations (unit type, weapon-ability rule matcher)
- `src/factions.ts` — faction grouping + accent colors
- `src/roster.ts` — roster persistence, totals, text export
- `src/ui.ts` — shared style tokens from the design
- `src/App.tsx` — all screens (datasheets, detail, picker, roster, modals)
