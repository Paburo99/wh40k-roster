import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  inches,
  parseWargearOptions,
  plus,
  splitCompCount,
  unitModelGroups,
  weaponAbilityRule,
  weaponBaseName,
  weaponChoices,
  wargearGroups,
} from './data';
import type { ParsedOption, UnitModelGroup } from './data';
import type { EditionData, WUnit, WWeapon } from './types';
import { BARLOW, card, chip, MONO, OSWALD, sectionTitle } from './ui';

/** Callbacks that make the loadout UI interactive for a roster entry. */
export interface WeaponSel {
  selected: string[];
  onToggle: (name: string) => void; // tap a single weapon (table rows, loose chips)
  onApply: (opt: ParsedOption, bundleIdx: number | null) => void; // pick a wargear alternative (null = default)
}

const STAT_KEYS = ['M', 'T', 'SV', 'W', 'LD', 'OC'];

export function WeaponTable({ title, weapons, skillHeader, data, sel }: { title: string; weapons: WWeapon[]; skillHeader: 'BS' | 'WS'; data: EditionData; sel?: WeaponSel }) {
  const [openAbil, setOpenAbil] = useState<number | null>(null);
  const grid = 'minmax(0,1fr) 40px 26px 30px 26px 28px 30px';
  const head: CSSProperties = { fontFamily: MONO, fontSize: 9, color: '#7d7566', textAlign: 'center' };
  const cell: CSSProperties = { fontFamily: MONO, fontSize: 11, color: '#c4bba8', textAlign: 'center' };
  return (
    <>
      <div style={sectionTitle}>{title}</div>
      <div style={{ ...card, padding: '10px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 4, paddingBottom: 6, borderBottom: '1px solid #2b2620' }}>
          <span style={{ ...head, textAlign: 'left', letterSpacing: 0.5 }}>WEAPON</span>
          <span style={head}>RNG</span>
          <span style={head}>A</span>
          <span style={head}>{skillHeader}</span>
          <span style={head}>S</span>
          <span style={head}>AP</span>
          <span style={head}>D</span>
        </div>
        {weapons.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#6f6759', padding: '10px 0 2px', letterSpacing: 0.5, textTransform: 'uppercase' }}>None</div>
        )}
        {weapons.map((w, i) => {
          const base = weaponBaseName(w.name);
          const isSel = sel ? sel.selected.includes(base) : false;
          return (
          <div key={i} style={{ padding: '8px 0 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 4, alignItems: 'baseline' }}>
              {sel ? (
                <button
                  onClick={() => sel.onToggle(base)}
                  style={{
                    background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer',
                    fontFamily: BARLOW, fontSize: 12.5, fontWeight: 600,
                    color: isSel ? '#e5a89a' : '#ddd6c8',
                  }}
                >
                  <span style={{ color: isSel ? '#cf5240' : '#6f6759', marginRight: 5 }}>{isSel ? '◆' : '◇'}</span>
                  {w.name}
                </button>
              ) : (
                <span style={{ fontFamily: BARLOW, fontSize: 12.5, fontWeight: 600, color: '#ddd6c8' }}>{w.name}</span>
              )}
              <span style={cell}>{inches(w.range)}</span>
              <span style={cell}>{w.A}</span>
              <span style={cell}>{plus(w.skill)}</span>
              <span style={cell}>{w.S}</span>
              <span style={cell}>{w.AP}</span>
              <span style={cell}>{w.D}</span>
            </div>
            {w.abils.length > 0 && (
              <button
                onClick={() => setOpenAbil(openAbil === i ? null : i)}
                style={{ background: 'none', border: 'none', padding: '3px 0 0', cursor: 'pointer', textAlign: 'left', fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.3, color: '#a06a3f' }}
              >
                [{w.abils.join(', ')}] <span style={{ color: '#6f6759' }}>{openAbil === i ? '▴' : '▾'}</span>
              </button>
            )}
            {openAbil === i && (
              <div style={{ margin: '6px 0 4px', padding: '10px 12px', background: '#14110f', border: '1px solid #2b2620', borderRadius: 8 }}>
                {w.abils.map((a) => {
                  const rule = weaponAbilityRule(data, a);
                  return (
                    <div key={a} style={{ padding: '4px 0' }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: '#d8a05f', textTransform: 'uppercase' }}>[{a}]</div>
                      <div style={{ fontFamily: BARLOW, fontSize: 12, color: '#9c9484', lineHeight: 1.45, marginTop: 2, whiteSpace: 'pre-wrap' }}>
                        {rule ? rule.text : 'Rule text not found in the core rules glossary.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </>
  );
}

/** Compact stat lines for the weapons of one wargear choice, shown inside an option card. */
function MiniWeaponStats({ bundle, u, data }: { bundle: string[]; u: WUnit; data: EditionData }) {
  const [openAbil, setOpenAbil] = useState<number | null>(null);
  const rows = u.weapons.filter((w) => bundle.includes(weaponBaseName(w.name)));
  const grid = 'minmax(0,1fr) 36px 24px 28px 24px 26px 28px';
  const head: CSSProperties = { fontFamily: MONO, fontSize: 8.5, color: '#6f6759', textAlign: 'center' };
  const cell: CSSProperties = { fontFamily: MONO, fontSize: 10.5, color: '#c4bba8', textAlign: 'center' };
  if (rows.length === 0) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9.5, color: '#6f6759', padding: '6px 2px 2px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        No weapon profile found
      </div>
    );
  }
  return (
    <div style={{ margin: '6px 0 2px', padding: '8px 10px', background: '#14110f', border: '1px solid #2b2620', borderRadius: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 4, paddingBottom: 4, borderBottom: '1px solid #26211c' }}>
        <span style={{ ...head, textAlign: 'left', letterSpacing: 0.5 }}>PROFILE</span>
        <span style={head}>RNG</span>
        <span style={head}>A</span>
        <span style={head}>HIT</span>
        <span style={head}>S</span>
        <span style={head}>AP</span>
        <span style={head}>D</span>
      </div>
      {rows.map((w, i) => (
        <div key={i} style={{ padding: '6px 0 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 4, alignItems: 'baseline' }}>
            <span style={{ fontFamily: BARLOW, fontSize: 11.5, fontWeight: 600, color: '#ddd6c8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
            <span style={cell}>{inches(w.range)}</span>
            <span style={cell}>{w.A}</span>
            <span style={cell}>{plus(w.skill)}</span>
            <span style={cell}>{w.S}</span>
            <span style={cell}>{w.AP}</span>
            <span style={cell}>{w.D}</span>
          </div>
          {w.abils.length > 0 && (
            <button
              onClick={() => setOpenAbil(openAbil === i ? null : i)}
              style={{ background: 'none', border: 'none', padding: '2px 0 0', cursor: 'pointer', textAlign: 'left', fontFamily: MONO, fontSize: 9, letterSpacing: 0.3, color: '#a06a3f' }}
            >
              [{w.abils.join(', ')}] <span style={{ color: '#6f6759' }}>{openAbil === i ? '▴' : '▾'}</span>
            </button>
          )}
          {openAbil === i && (
            <div style={{ margin: '4px 0 2px', padding: '8px 10px', background: '#100e0c', border: '1px solid #26211c', borderRadius: 6 }}>
              {w.abils.map((a) => {
                const rule = weaponAbilityRule(data, a);
                return (
                  <div key={a} style={{ padding: '3px 0' }}>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.8, color: '#d8a05f', textTransform: 'uppercase' }}>[{a}]</div>
                    <div style={{ fontFamily: BARLOW, fontSize: 11.5, color: '#9c9484', lineHeight: 1.45, marginTop: 2, whiteSpace: 'pre-wrap' }}>
                      {rule ? rule.text : 'Rule text not found in the core rules glossary.'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * One wargear option as a visual card: the default loadout, the alternatives
 * it can be swapped for, and expandable weapon stats for each choice. When
 * `sel` is provided the rows are tappable and apply the swap to the roster
 * entry; without it the card is read-only reference.
 */
function WargearOptionCard({ u, data, opt, sel }: { u: WUnit; data: EditionData; opt: ParsedOption; sel?: WeaponSel }) {
  const [proseOpen, setProseOpen] = useState(false);
  const [openStats, setOpenStats] = useState<string | null>(null);
  const shell: CSSProperties = { background: '#16130f', border: '1px solid #26211c', borderRadius: 10, padding: '10px 10px 8px', marginBottom: 8 };

  if (opt.kind === 'other') {
    return (
      <div style={shell}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ color: '#b5493c', fontSize: 12, lineHeight: 1.5 }}>◆</span>
          <span style={{ fontFamily: BARLOW, fontSize: 12, color: '#b3ab9a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{opt.text}</span>
        </div>
      </div>
    );
  }

  const selected = sel?.selected ?? [];
  const bundleActive = (b: string[]) => b.length > 0 && b.every((w) => selected.includes(w));
  const anyAltActive = opt.alternatives.some((b) => bundleActive(b));
  const defaultActive = !opt.alternatives.flat().some((w) => selected.includes(w));

  const choiceRow = (key: string, label: string, bundle: string[], opts: { badge?: string; active: boolean; onPick?: () => void }) => {
    const statsOpen = openStats === key;
    const marker = sel ? (opts.active ? '◆' : '◇') : '·';
    return (
      <div key={key}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={opts.onPick}
            disabled={!opts.onPick}
            style={{
              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, textAlign: 'left',
              background: 'none', border: 'none', padding: '7px 0', cursor: opts.onPick ? 'pointer' : 'default',
            }}
          >
            <span style={{ color: opts.active && sel ? '#cf5240' : '#6f6759', fontSize: 12, flexShrink: 0 }}>{marker}</span>
            <span style={{ fontFamily: BARLOW, fontSize: 12.5, fontWeight: 600, color: opts.active && sel ? '#e5a89a' : '#ddd6c8', lineHeight: 1.3 }}>
              {label}
              {opts.badge && (
                <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.6, color: opts.active && sel ? '#c98577' : '#6b6457', marginLeft: 6 }}>{opts.badge}</span>
              )}
            </span>
          </button>
          {bundle.length > 0 && (
            <button
              onClick={() => setOpenStats(statsOpen ? null : key)}
              style={{ background: 'none', border: 'none', padding: '7px 2px', cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.5, color: '#7d7566', flexShrink: 0 }}
            >
              STATS {statsOpen ? '▴' : '▾'}
            </button>
          )}
        </div>
        {statsOpen && <MiniWeaponStats bundle={bundle} u={u} data={data} />}
      </div>
    );
  };

  return (
    <div style={shell}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 0.8, color: '#7d7566', textTransform: 'uppercase' }}>
          {opt.constraint ?? (opt.kind === 'add' ? 'Optional extra' : 'Weapon swap')}
        </span>
        <button
          onClick={() => setProseOpen(!proseOpen)}
          style={{ background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.5, color: '#7d7566' }}
        >
          FULL RULE {proseOpen ? '▴' : '▾'}
        </button>
      </div>
      {proseOpen && (
        <div style={{ fontFamily: BARLOW, fontSize: 11.5, color: '#9c9484', lineHeight: 1.45, whiteSpace: 'pre-wrap', margin: '4px 0 6px' }}>{opt.text}</div>
      )}

      {opt.kind === 'add' ? (
        opt.alternatives.map((b, i) =>
          choiceRow(`a${i}`, '+ ' + b.join(' + '), b, {
            badge: 'OPTIONAL',
            active: bundleActive(b),
            onPick: sel ? () => sel.onApply(opt, bundleActive(b) ? null : i) : undefined,
          }),
        )
      ) : (
        <>
          {opt.defaults.length > 0 &&
            choiceRow('d', opt.defaults.join(' + '), opt.defaults, {
              badge: 'DEFAULT',
              active: defaultActive && !anyAltActive,
              onPick: sel ? () => sel.onApply(opt, null) : undefined,
            })}
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: '#8a5a4a', textTransform: 'uppercase', padding: '3px 0 2px', borderTop: '1px dashed #26211c' }}>
            ↳ can swap for
          </div>
          {opt.alternatives.map((b, i) =>
            choiceRow(`a${i}`, b.join(' + '), b, {
              active: bundleActive(b),
              onPick: sel ? () => sel.onApply(opt, i) : undefined,
            }),
          )}
        </>
      )}
    </div>
  );
}

/** Section header for one model type: '1× FIRE DRAGON EXARCH'. */
function GroupHeader({ group, compact }: { group: UnitModelGroup; compact?: boolean }) {
  const c = group.count ? splitCompCount(group.count) : null;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, margin: compact ? '10px 2px 6px' : '20px 2px 0', paddingBottom: compact ? 0 : 5, borderBottom: compact ? 'none' : '1px solid #352e27' }}>
      {c?.count && (
        <span style={{ fontFamily: MONO, fontSize: compact ? 11 : 13, fontWeight: 600, color: '#b5493c', flexShrink: 0 }}>{c.count}</span>
      )}
      <span style={{ fontFamily: OSWALD, fontSize: compact ? 12 : 14, fontWeight: 600, letterSpacing: compact ? 0.8 : 1, textTransform: 'uppercase', color: '#d8a05f' }}>{group.name}</span>
    </div>
  );
}

/**
 * The full loadout block for a unit: weapons and wargear options split per
 * model type when the datasheet distinguishes them, with visual option cards.
 * mode 'datasheet' renders stat/weapon tables; mode 'roster' renders the
 * compact option picker used inside a roster entry.
 */
export function UnitLoadoutView({ u, data, sel, mode }: { u: WUnit; data: EditionData; sel?: WeaponSel; mode: 'datasheet' | 'roster' }) {
  const groups = unitModelGroups(u);
  const parsed = parseWargearOptions(u);
  // options owned by every model type are unit-wide: show them once
  const shared = new Set<ParsedOption>(
    groups && groups.length > 1 ? groups[0].options.filter((o) => groups.every((g) => g.options.includes(o))) : [],
  );

  const tables = (weapons: WWeapon[]) => (
    <>
      <WeaponTable title="Ranged Weapons" weapons={weapons.filter((w) => w.type === 'R')} skillHeader="BS" data={data} sel={sel} />
      <WeaponTable title="Melee Weapons" weapons={weapons.filter((w) => w.type === 'M')} skillHeader="WS" data={data} sel={sel} />
    </>
  );
  const cards = (opts: ParsedOption[]) => opts.map((o, i) => <WargearOptionCard key={i} u={u} data={data} opt={o} sel={sel} />);

  if (mode === 'datasheet') {
    if (!groups) {
      return (
        <>
          {tables(u.weapons)}
          {parsed.length > 0 && (
            <>
              <div style={sectionTitle}>Wargear Options</div>
              {cards(parsed)}
            </>
          )}
        </>
      );
    }
    return (
      <>
        {groups.map((g) => {
          const own = g.options.filter((o) => !shared.has(o));
          const has = (w: WWeapon) => g.weapons.includes(weaponBaseName(w.name));
          const ranged = u.weapons.filter((w) => w.type === 'R' && has(w));
          const melee = u.weapons.filter((w) => w.type === 'M' && has(w));
          return (
            <div key={g.name}>
              <GroupHeader group={g} />
              {g.distinctStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginTop: 10 }}>
                  {[g.stats.M, g.stats.T, plus(g.stats.Sv), g.stats.W, plus(g.stats.Ld), g.stats.OC].map((v, i) => (
                    <div key={STAT_KEYS[i]} style={{ background: '#14110f', border: '1px solid #352e27', borderRadius: 8, padding: '7px 0 6px', textAlign: 'center' }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: '#8a5a4a' }}>{STAT_KEYS[i]}</div>
                      <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: '#ece5d5', marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {ranged.length > 0 && <WeaponTable title="Ranged Weapons" weapons={ranged} skillHeader="BS" data={data} sel={sel} />}
              {melee.length > 0 && <WeaponTable title="Melee Weapons" weapons={melee} skillHeader="WS" data={data} sel={sel} />}
              {own.length > 0 && (
                <>
                  <div style={{ ...sectionTitle, fontSize: 11, margin: '14px 2px 8px' }}>Wargear Options</div>
                  {cards(own)}
                </>
              )}
            </div>
          );
        })}
        {shared.size > 0 && (
          <>
            <div style={sectionTitle}>Whole Unit — Wargear Options</div>
            {cards([...shared])}
          </>
        )}
      </>
    );
  }

  // roster mode: compact picker — option cards per model type plus loose weapon chips
  const groupedNames = new Set(wargearGroups(u).flatMap((g) => g.choices));
  const otherChoices = weaponChoices(u).filter((n) => !groupedNames.has(n));
  if (parsed.length === 0 && otherChoices.length <= 1) return null;
  return (
    <>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.2, color: '#7d7566', textTransform: 'uppercase', margin: '12px 2px 6px' }}>Weapons</div>
      {groups ? (
        <>
          {groups.map((g) => {
            const own = g.options.filter((o) => !shared.has(o));
            if (own.length === 0) return null;
            return (
              <div key={g.name}>
                <GroupHeader group={g} compact />
                {cards(own)}
              </div>
            );
          })}
          {shared.size > 0 && (
            <>
              {groups.some((g) => g.options.length > shared.size) && (
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 0.8, color: '#7d7566', textTransform: 'uppercase', margin: '10px 2px 6px' }}>Whole unit</div>
              )}
              {cards([...shared])}
            </>
          )}
        </>
      ) : (
        cards(parsed)
      )}
      {otherChoices.length > 0 && sel && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {otherChoices.map((wName) => (
            <button
              key={wName}
              style={chip(sel.selected.includes(wName), { padding: '7px 10px', minHeight: 32, textTransform: 'none', letterSpacing: 0.3 })}
              onClick={() => sel.onToggle(wName)}
            >
              {wName}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
