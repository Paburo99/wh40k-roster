# Tabletop Roster

Mobile-first web app for browsing Warhammer 40k datasheets (10th **and 11th** edition) and
building point-limited army rosters per player. Implements the Claude Design handoff in
`../design-handoff/`.

## Run

```
npm install
npm run dev       # dev server on http://localhost:5173
npm run build     # production build in dist/
npm run data      # refresh public/data/*.json from Wahapedia + the 11e MFM repo
npm run ai-proxy  # CORS proxy for the AI assistant (key from .env / env var)
```

## Features

- **Datasheets tab** — 10th/11th edition toggle, search, faction filter (grouped
  Imperium/Chaos/Xenos/Unaligned), type chips (derived from keywords), card/row view.
- **Datasheet detail** — statline per model profile, ranged/melee weapon tables with
  **tappable weapon abilities that expand the core-rules text** (e.g. Lethal Hits,
  Rapid Fire X), collapsible ability rules (datasheet, faction and core), **wargear
  options**, unit composition + default loadout, transport, damaged profile, keywords,
  points, and a **mini-photo slot**: attach a photo of your own painted model (stored
  locally in IndexedDB, downscaled; shown as thumbnails on datasheet and roster cards).
  When opened from a roster entry ("View datasheet"), weapons become **tappable to
  equip the entry** — picking a replacement swaps out its default automatically.
- **Army Builder tab** — players → armies (per edition) → roster. Point limit with
  progress bar and over-limit warning, size brackets and quantity per entry,
  **wargear option groups per entry** (each replace/instead option renders as a
  radio-style group with the default weapon pre-selected, official-app style; picking
  an alternative swaps automatically and stays in sync with the datasheet weapon
  picker), per-entry and per-army notes, duplicate, plain-text export (includes
  chosen weapons), two-tap delete.
- **Rules tab** — full-text search over the complete gameplay rules of the selected
  edition: core rules sections, rules commentary + FAQs (10e) / rules appendix (11e),
  plus the shared-ability glossary (Deep Strike, Leader, faction rules…) and weapon
  abilities. Matches show highlighted snippets; sections expand to the full rule text.
- **Ask AI (Rules tab)** — a mid-game rules assistant. Questions are answered by
  **MiniMax M3** (`minimaxai/minimax-m3`) via the **NVIDIA Build API**
  (build.nvidia.com), grounded in retrieved rule sections, glossary entries and
  datasheets from the local database; every answer cites its sources as [n] with
  expandable reference cards for verification. Setup: copy `.env.example` to `.env`
  and set `NVIDIA_API_KEY=nvapi-…`. `integrate.api.nvidia.com` blocks browser CORS,
  so requests go through a proxy that attaches the key from `.env`: the vite dev
  server proxies `/nvapi` automatically; elsewhere run `npm run ai-proxy` and keep
  the default endpoint (`http://localhost:8787/…`). Model/endpoint (and optionally
  a per-device key) are configurable in the ⚙ settings.

## Data

Data is snapshotted from [Wahapedia](https://wahapedia.ru)'s CSV exports
(`wh40k10ed` / `wh40k11ed`) by `scripts/build-data.mjs` into static JSON under
`public/data/` (~3.5 MB per edition, lazy-loaded per edition at runtime):

- Datasheets, model profiles, points brackets, weapon profiles with abilities,
  wargear option texts, datasheet/faction/core ability rule texts, keywords, composition.
- Full gameplay-rules sections (`rules-10e.json` / `rules-11e.json`, ~0.2 MB each,
  loaded only when the Rules tab is opened) scraped from each edition's rules pages
  and combined with the ability glossaries.
- **11th-edition points** come from the official Munitorum Field Manual via
  [BSData/wh40k-11e-mfm](https://github.com/BSData/wh40k-11e-mfm) (a bot-maintained
  parse of mfm.warhammer-community.com, used by the New Recruit data community),
  because Wahapedia's 11e cost export is still largely seeded from 10e. The build
  matches MFM units to Wahapedia datasheets by normalized name (faction file first,
  then a global index; ~97% matched) and keeps the new 11e tiered pricing
  ("1st to 2nd unit" vs "3rd+ units") as extra brackets. Unmatched units keep
  Wahapedia's values. Re-run `npm run data` to pick up MFM updates.
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
