import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { abilityText, inches, loadEdition, plus, UNIT_TYPES, unitType, weaponAbilityRule, weaponChoices } from './data';
import { factionColor, groupFactions } from './factions';
import { armyTotal, buildExport, loadPlayers, savePlayers, uid } from './roster';
import type { Army, Edition, EditionData, Player, WUnit, WWeapon } from './types';
import { BARLOW, card, chip, MONO, OSWALD, screenBg, sectionTitle, segBtn, stripe } from './ui';

type Modal = 'newPlayer' | 'newArmy' | 'export' | null;
type FactionPickerTarget = 'filter' | 'newArmy' | null;

export default function App() {
  const [datasets, setDatasets] = useState<Partial<Record<Edition, EditionData>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());
  const [tab, setTab] = useState<'data' | 'roster'>('data');
  const [edition, setEdition] = useState<Edition>(11);

  // datasheet filters
  const [query, setQuery] = useState('');
  const [factionF, setFactionF] = useState<string | null>(null);
  const [typeF, setTypeF] = useState<string | null>(null);
  const [viewCards, setViewCards] = useState(true);

  // navigation
  const [detail, setDetail] = useState<{ unit: WUnit; edition: Edition; addArmyId: string | null } | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [armyId, setArmyId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // modals
  const [modal, setModal] = useState<Modal>(null);
  const [npName, setNpName] = useState('');
  const [naName, setNaName] = useState('');
  const [naFaction, setNaFaction] = useState('Space Marines');
  const [naEdition, setNaEdition] = useState<Edition>(11);
  const [naLimit, setNaLimit] = useState(2000);
  const [factionPicker, setFactionPicker] = useState<FactionPickerTarget>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const player = playerId ? players.find((p) => p.id === playerId) ?? null : null;
  const army = player && armyId ? player.armies.find((a) => a.id === armyId) ?? null : null;

  // load the edition needed by the current screen
  const neededEdition: Edition = tab === 'roster' && army ? army.edition : edition;
  useEffect(() => {
    if (datasets[neededEdition]) return;
    loadEdition(neededEdition)
      .then((d) => setDatasets((prev) => ({ ...prev, [neededEdition]: d })))
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, [neededEdition, datasets]);

  const data = datasets[edition] ?? null;
  const armyData = army ? datasets[army.edition] ?? null : null;

  const unitById = useMemo(() => {
    const m = new Map<string, WUnit>();
    for (const u of armyData?.units ?? []) m.set(u.id, u);
    return m;
  }, [armyData]);

  function save(fn: (prev: Player[]) => Player[]) {
    setPlayers((prev) => {
      const next = fn(prev);
      savePlayers(next);
      return next;
    });
  }

  function updateArmy(id: string, fn: (a: Army) => Army) {
    save((prev) => prev.map((p) => ({ ...p, armies: p.armies.map((a) => (a.id === id ? fn(a) : a)) })));
  }

  function addEntry(targetArmyId: string, unitId: string, sizeIdx: number) {
    updateArmy(targetArmyId, (a) => {
      const existing = a.entries.find((e) => e.unitId === unitId && e.sizeIdx === sizeIdx);
      if (existing) {
        return { ...a, entries: a.entries.map((e) => (e === existing ? { ...e, qty: e.qty + 1 } : e)) };
      }
      return { ...a, entries: [...a.entries, { id: uid('e'), unitId, sizeIdx, qty: 1, notes: '', weapons: [] }] };
    });
  }

  // ---------- filtered datasheets ----------
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.units.filter(
      (u) =>
        (!factionF || u.faction === factionF) &&
        (!typeF || unitType(u) === typeF) &&
        (!q || u.name.toLowerCase().includes(q) || u.keywords.join(' ').toLowerCase().includes(q)),
    );
  }, [data, query, factionF, typeF]);

  function openDetail(unit: WUnit, ed: Edition, addArmyId?: string) {
    setDetail({ unit, edition: ed, addArmyId: addArmyId ?? null });
  }

  // ---------- loading / error ----------
  if (!data && !army) {
    return (
      <Shell>
        <LoadingScreen error={loadError} />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* ============ DATASHEETS TAB ============ */}
      {tab === 'data' && !data && <LoadingScreen error={loadError} />}
      {tab === 'data' && data && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '68px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontFamily: OSWALD, fontSize: 24, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#e6dfd0' }}>
                  Datasheets
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: '#7d7566', textTransform: 'uppercase', marginTop: 2 }}>
                  {filtered.length} units · {edition}th edition
                </div>
              </div>
              <div style={{ display: 'flex', gap: 0, border: '1px solid #352e27', borderRadius: 8, overflow: 'hidden' }}>
                {([10, 11] as Edition[]).map((ed) => (
                  <button key={ed} style={segBtn(edition === ed)} onClick={() => setEdition(ed)}>
                    {ed}TH
                  </button>
                ))}
              </div>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search units…" style={searchInput} />
            <button onClick={() => setFactionPicker('filter')} style={factionBtn}>
              <span>{factionF ?? 'All Factions'}</span>
              <span style={{ color: '#7d7566' }}>▾</span>
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', marginTop: 8, paddingBottom: 10 }}>
              {[{ id: null as string | null, name: 'All Types' }, ...UNIT_TYPES.map((t) => ({ id: t as string | null, name: t }))].map((t) => (
                <button key={t.name} style={chip(typeF === t.id)} onClick={() => setTypeF(t.id)}>
                  {t.name}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: '#2e2822', flexShrink: 0 }} />
              {[
                { label: 'Cards', v: true },
                { label: 'Rows', v: false },
              ].map((o) => (
                <button key={o.label} style={chip(viewCards === o.v)} onClick={() => setViewCards(o.v)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '2px 16px 110px' }}>
            {filtered.map((u) => (
              <UnitRow key={u.id} u={u} viewCards={viewCards} onOpen={() => openDetail(u, edition)} />
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6f6759', fontFamily: MONO, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                No units match
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ ROSTER: PLAYERS ============ */}
      {tab === 'roster' && !playerId && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '68px 16px 12px' }}>
            <div style={{ fontFamily: OSWALD, fontSize: 24, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#e6dfd0' }}>Roster</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: '#7d7566', textTransform: 'uppercase', marginTop: 2 }}>Players &amp; armies</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '2px 16px 110px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlayerId(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', ...card, padding: '16px 14px', minHeight: 64, cursor: 'pointer', color: '#ddd6c8', fontFamily: BARLOW }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#241f1a', border: '1px solid #352e27', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: OSWALD, fontSize: 17, fontWeight: 600, color: '#b5493c', flexShrink: 0 }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: OSWALD, fontSize: 17, fontWeight: 600, letterSpacing: 0.5, color: '#e6dfd0' }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 0.5, color: '#857c6c', marginTop: 2, textTransform: 'uppercase' }}>
                    {p.armies.length} {p.armies.length === 1 ? 'army' : 'armies'}
                  </div>
                </div>
                <div style={{ color: '#5c5548', fontSize: 20 }}>›</div>
              </button>
            ))}
            <button onClick={() => { setModal('newPlayer'); setNpName(''); }} style={dashedBtn}>
              + New Player
            </button>
          </div>
        </div>
      )}

      {/* ============ ROSTER: ARMIES OF A PLAYER ============ */}
      {tab === 'roster' && player && !army && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '62px 16px 12px' }}>
            <button onClick={() => setPlayerId(null)} style={backBtn}>
              ‹ Players
            </button>
            <div style={{ fontFamily: OSWALD, fontSize: 24, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#e6dfd0' }}>{player.name}</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '2px 16px 110px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {player.armies.map((a) => {
              const ds = datasets[a.edition];
              const byId = new Map((ds?.units ?? []).map((u) => [u.id, u]));
              const total = ds ? armyTotal(a, byId) : 0;
              const over = total > a.limit;
              const pct = Math.min(100, (total / a.limit) * 100);
              return (
                <button
                  key={a.id}
                  onClick={() => { setArmyId(a.id); setExpandedEntry(null); setConfirmDel(false); }}
                  style={{ display: 'flex', alignItems: 'stretch', width: '100%', textAlign: 'left', ...card, padding: 0, cursor: 'pointer', overflow: 'hidden', color: '#ddd6c8', fontFamily: BARLOW }}
                >
                  <div style={stripe(factionColor(a.faction))} />
                  <div style={{ flex: 1, minWidth: 0, padding: '14px 14px 14px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontFamily: OSWALD, fontSize: 16, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: '#e6dfd0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.name}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: '#d8cfbd', flexShrink: 0 }}>
                        {ds ? `${total}/${a.limit}` : `—/${a.limit}`}
                      </div>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 0.5, color: '#857c6c', marginTop: 3, textTransform: 'uppercase' }}>
                      {a.faction} · {a.edition}th · {a.entries.length} units
                    </div>
                    <div style={{ height: 4, background: '#26211c', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: pct + '%', background: over ? '#d94f35' : 'linear-gradient(90deg, #8c1f1a, #b5493c)', borderRadius: 999 }} />
                    </div>
                  </div>
                </button>
              );
            })}
            <button onClick={() => { setModal('newArmy'); setNaName(''); }} style={dashedBtn}>
              + New Army
            </button>
          </div>
        </div>
      )}

      {/* ============ ROSTER: ARMY DETAIL ============ */}
      {tab === 'roster' && player && army && !armyData && <LoadingScreen error={loadError} />}
      {tab === 'roster' && player && army && armyData && (
        <ArmyDetail
          army={army}
          playerName={player.name}
          data={armyData}
          unitById={unitById}
          expandedEntry={expandedEntry}
          confirmDel={confirmDel}
          onBack={() => { setArmyId(null); setExpandedEntry(null); setConfirmDel(false); }}
          onToggleEntry={(id) => setExpandedEntry(expandedEntry === id ? null : id)}
          onUpdate={(fn) => updateArmy(army.id, fn)}
          onOpenPicker={() => { setPickerOpen(true); setPickerQuery(''); }}
          onOpenExport={() => { setModal('export'); setCopied(false); }}
          onViewSheet={(u) => openDetail(u, army.edition)}
          onDuplicate={() => {
            const copy: Army = { ...army, id: uid('a'), name: army.name + ' (copy)', entries: army.entries.map((e) => ({ ...e, id: uid('e') })) };
            save((prev) => prev.map((p) => (p.id === player.id ? { ...p, armies: [...p.armies, copy] } : p)));
            setArmyId(copy.id);
            setExpandedEntry(null);
          }}
          onDelete={() => {
            if (!confirmDel) { setConfirmDel(true); return; }
            save((prev) => prev.map((p) => (p.id === player.id ? { ...p, armies: p.armies.filter((a) => a.id !== army.id) } : p)));
            setArmyId(null);
            setConfirmDel(false);
          }}
        />
      )}

      {/* ============ TAB BAR ============ */}
      <TabBar tab={tab} onData={() => setTab('data')} onRoster={() => setTab('roster')} />

      {/* ============ UNIT PICKER ============ */}
      {pickerOpen && army && armyData && (
        <UnitPicker
          army={army}
          data={armyData}
          unitById={unitById}
          query={pickerQuery}
          setQuery={setPickerQuery}
          onOpenDetail={(u) => openDetail(u, army.edition, army.id)}
          onQuickAdd={(id) => addEntry(army.id, id, 0)}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* ============ UNIT DETAIL ============ */}
      {detail && datasets[detail.edition] && (
        <UnitDetail
          u={detail.unit}
          data={datasets[detail.edition]!}
          showAdd={!!detail.addArmyId}
          onAdd={(sizeIdx) => {
            if (detail.addArmyId) addEntry(detail.addArmyId, detail.unit.id, sizeIdx);
            setDetail(null);
          }}
          onClose={() => setDetail(null)}
        />
      )}

      {/* ============ FACTION PICKER ============ */}
      {factionPicker && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #141110 0%, #100e0c 100%)' }}>
          <div style={{ padding: '62px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #26211c' }}>
            <div style={{ fontFamily: OSWALD, fontSize: 20, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#e6dfd0' }}>Select Faction</div>
            <button onClick={() => setFactionPicker(null)} style={{ background: 'none', border: 'none', color: '#7d7566', fontSize: 20, cursor: 'pointer', padding: '8px 4px' }}>
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 40px' }}>
            {factionPicker === 'filter' && (
              <button onClick={() => { setFactionF(null); setFactionPicker(null); }} style={factionRow}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#55606b', flexShrink: 0 }} />
                <span style={{ flex: 1, fontFamily: BARLOW, fontSize: 15, fontWeight: 600, color: '#ddd6c8' }}>All Factions</span>
                {!factionF && <span style={{ color: '#cf5240', fontSize: 15 }}>✓</span>}
              </button>
            )}
            {groupFactions((factionPicker === 'newArmy' ? datasets[naEdition] : data)?.factions ?? []).map((g) => (
              <div key={g.name}>
                <div style={{ ...sectionTitle, margin: '20px 2px 4px' }}>{g.name}</div>
                {g.factions.map((f) => {
                  const sel = factionPicker === 'newArmy' ? naFaction === f : factionF === f;
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        if (factionPicker === 'newArmy') setNaFaction(f);
                        else setFactionF(f);
                        setFactionPicker(null);
                      }}
                      style={factionRow}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: factionColor(f), flexShrink: 0 }} />
                      <span style={{ flex: 1, fontFamily: BARLOW, fontSize: 15, fontWeight: 600, color: '#ddd6c8' }}>{f}</span>
                      {sel && <span style={{ color: '#cf5240', fontSize: 15 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ MODAL: NEW PLAYER ============ */}
      {modal === 'newPlayer' && (
        <ModalCenter>
          <div style={{ fontFamily: OSWALD, fontSize: 16, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#e6dfd0' }}>New Player</div>
          <input value={npName} onChange={(e) => setNpName(e.target.value)} placeholder="Player name" style={{ ...modalInput, marginTop: 14 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setModal(null)} style={cancelBtn}>Cancel</button>
            <button
              onClick={() => {
                const name = npName.trim();
                if (!name) return;
                save((prev) => [...prev, { id: uid('p'), name, armies: [] }]);
                setModal(null);
              }}
              style={primaryBtn}
            >
              Create
            </button>
          </div>
        </ModalCenter>
      )}

      {/* ============ MODAL: NEW ARMY ============ */}
      {modal === 'newArmy' && player && (
        <ModalCenter scroll>
          <div style={{ fontFamily: OSWALD, fontSize: 16, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#e6dfd0' }}>New Army</div>
          <input value={naName} onChange={(e) => setNaName(e.target.value)} placeholder="Army name" style={{ ...modalInput, marginTop: 14 }} />
          <div style={modalLabel}>Faction</div>
          <button onClick={() => setFactionPicker('newArmy')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', minHeight: 44, background: '#14110f', border: '1px solid #302a24', borderRadius: 10, color: '#ddd6c8', fontFamily: MONO, fontSize: 11.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer' }}>
            <span>{naFaction}</span>
            <span style={{ color: '#7d7566' }}>▾</span>
          </button>
          <div style={modalLabel}>Edition</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([10, 11] as Edition[]).map((ed) => (
              <button key={ed} style={chip(naEdition === ed)} onClick={() => setNaEdition(ed)}>
                {ed}th Edition
              </button>
            ))}
          </div>
          <div style={modalLabel}>Point Limit</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[500, 1000, 2000, 3000].map((l) => (
              <button key={l} style={chip(naLimit === l)} onClick={() => setNaLimit(l)}>
                {l} pts
              </button>
            ))}
          </div>
          <input
            value={String(naLimit || '')}
            onChange={(e) => setNaLimit(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)}
            inputMode="numeric"
            placeholder="Custom limit"
            style={{ ...modalInput, marginTop: 8, fontFamily: MONO, fontSize: 13, minHeight: 42, padding: '10px 12px' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button onClick={() => setModal(null)} style={cancelBtn}>Cancel</button>
            <button
              onClick={() => {
                const name = naName.trim();
                if (!name) return;
                const newArmy: Army = { id: uid('a'), name, faction: naFaction, edition: naEdition, limit: naLimit || 2000, notes: '', entries: [] };
                save((prev) => prev.map((p) => (p.id === player.id ? { ...p, armies: [...p.armies, newArmy] } : p)));
                setModal(null);
                setArmyId(newArmy.id);
              }}
              style={primaryBtn}
            >
              Create
            </button>
          </div>
        </ModalCenter>
      )}

      {/* ============ MODAL: EXPORT ============ */}
      {modal === 'export' && army && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(6,5,4,0.7)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#1d1a16', borderTop: '1px solid #3a332b', borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', maxHeight: '78%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: OSWALD, fontSize: 16, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#e6dfd0' }}>Export Roster</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#7d7566', fontSize: 20, cursor: 'pointer', padding: '6px 4px' }}>
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginTop: 12, background: '#100e0c', border: '1px solid #2b2620', borderRadius: 10, padding: 14 }}>
              <pre style={{ margin: 0, fontFamily: MONO, fontSize: 10.5, lineHeight: 1.65, color: '#b3ab9a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {buildExport(army, unitById)}
              </pre>
            </div>
            <button
              onClick={() => {
                if (navigator.clipboard) void navigator.clipboard.writeText(buildExport(army, unitById));
                setCopied(true);
              }}
              style={{ ...primaryBtn, width: '100%', minHeight: 50, marginTop: 12, fontSize: 12, letterSpacing: 1.5 }}
            >
              {copied ? '✓ Copied' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ================= layout shell =================

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 0%, #17130f 0%, #0a0908 60%)' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 430, height: '100dvh', overflow: 'hidden', fontFamily: BARLOW, color: '#ddd6c8', background: screenBg }}>
        {children}
      </div>
    </div>
  );
}

function LoadingScreen({ error }: { error: string | null }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
      <div style={{ fontFamily: OSWALD, fontSize: 20, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#e6dfd0' }}>Tabletop Roster</div>
      {error ? (
        <>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 0.5, color: '#e0937f', textAlign: 'center', lineHeight: 1.6 }}>
            Could not load the datasheet dataset.
            <br />
            {error}
          </div>
          <button onClick={() => location.reload()} style={chip(true)}>
            Retry
          </button>
        </>
      ) : (
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1, color: '#7d7566', textTransform: 'uppercase' }}>Loading datasheets…</div>
      )}
    </div>
  );
}

// ================= datasheet list row =================

const STAT_KEYS = ['M', 'T', 'SV', 'W', 'LD', 'OC'] as const;

function statCells(u: WUnit) {
  const m = u.models[0];
  const vals = [m.M, m.T, plus(m.Sv), m.W, plus(m.Ld), m.OC];
  return STAT_KEYS.map((k, i) => ({ k, v: vals[i] ?? '—' }));
}

function UnitRow({ u, viewCards, onOpen }: { u: WUnit; viewCards: boolean; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{ display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', background: '#1b1815', border: '1px solid #2b2620', borderRadius: 12, padding: 0, marginBottom: 8, cursor: 'pointer', overflow: 'hidden', color: '#ddd6c8', fontFamily: BARLOW }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
        <div style={stripe(factionColor(u.faction))} />
        <div style={{ flex: 1, minWidth: 0, padding: '12px 0 12px 12px' }}>
          <div style={{ fontFamily: OSWALD, fontSize: 15, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: '#e6dfd0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {u.name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 0.5, color: '#857c6c', marginTop: 3, textTransform: 'uppercase' }}>
            {u.faction} · {unitType(u)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 14px', flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: '#d8cfbd' }}>{u.costs[0]?.pts ?? 0}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#7d7566', letterSpacing: 1 }}>PTS</span>
        </div>
      </div>
      {viewCards && (
        <div style={{ width: '100%', padding: '0 12px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
            {statCells(u).map((s) => (
              <div key={s.k} style={{ background: '#14110f', border: '1px solid #2b2620', borderRadius: 6, padding: '6px 0 5px', textAlign: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#ddd6c8' }}>{s.v}</div>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: '#6f6759', marginTop: 1 }}>{s.k}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.5, color: '#6f6759', marginTop: 8, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {u.keywords.slice(0, 6).join(' · ')}
          </div>
        </div>
      )}
    </button>
  );
}

// ================= unit detail =================

function WeaponTable({ title, weapons, skillHeader, data }: { title: string; weapons: WWeapon[]; skillHeader: 'BS' | 'WS'; data: EditionData }) {
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
        {weapons.map((w, i) => (
          <div key={i} style={{ padding: '8px 0 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 4, alignItems: 'baseline' }}>
              <span style={{ fontFamily: BARLOW, fontSize: 12.5, fontWeight: 600, color: '#ddd6c8' }}>{w.name}</span>
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
        ))}
      </div>
    </>
  );
}

function UnitDetail({ u, data, showAdd, onAdd, onClose }: { u: WUnit; data: EditionData; showAdd: boolean; onAdd: (sizeIdx: number) => void; onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column', background: screenBg }}>
      <div style={{ padding: '58px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onClose} style={{ background: '#1b1815', border: '1px solid #352e27', borderRadius: 999, padding: '10px 16px', minHeight: 40, color: '#b3ab9a', fontFamily: MONO, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
          ‹ Back
        </button>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: '#7d7566', textTransform: 'uppercase' }}>{data.edition}th edition</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 24px' }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ height: 5, background: `linear-gradient(90deg, ${factionColor(u.faction)}, #1b1815)` }} />
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 84, height: 84, flexShrink: 0, borderRadius: 10, background: '#14110f', border: '1px dashed #352e27', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.5, color: '#5c5548', textTransform: 'uppercase', textAlign: 'center' }}>
                mini photo
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: OSWALD, fontSize: 21, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#ece5d5', lineHeight: 1.15 }}>{u.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 0.8, color: '#857c6c', marginTop: 4, textTransform: 'uppercase' }}>
                  {u.faction} · {unitType(u)}
                  {u.models[0]?.inv && u.models[0].inv !== '-' ? ` · ${plus(u.models[0].inv)} INVULN` : ''}
                </div>
              </div>
            </div>
            {u.models.map((m, mi) => (
              <div key={mi}>
                {u.models.length > 1 && (
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.8, color: '#857c6c', textTransform: 'uppercase', margin: '12px 2px 0' }}>{m.name}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginTop: u.models.length > 1 ? 6 : 14 }}>
                  {[m.M, m.T, plus(m.Sv), m.W, plus(m.Ld), m.OC].map((v, i) => (
                    <div key={STAT_KEYS[i]} style={{ background: '#14110f', border: '1px solid #352e27', borderRadius: 8, padding: '8px 0 7px', textAlign: 'center' }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: '#8a5a4a' }}>{STAT_KEYS[i]}</div>
                      <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 600, color: '#ece5d5', marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <WeaponTable title="Ranged Weapons" weapons={u.weapons.filter((w) => w.type === 'R')} skillHeader="BS" data={data} />
        <WeaponTable title="Melee Weapons" weapons={u.weapons.filter((w) => w.type === 'M')} skillHeader="WS" data={data} />

        {u.options.length > 0 && (
          <>
            <div style={sectionTitle}>Wargear Options</div>
            <div style={{ ...card, padding: '4px 14px' }}>
              {u.options.map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '10px 0', borderBottom: '1px solid #26211c' }}>
                  <span style={{ color: '#b5493c', fontSize: 12, lineHeight: 1.5 }}>◆</span>
                  <span style={{ fontFamily: BARLOW, fontSize: 12.5, color: '#b3ab9a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{o}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={sectionTitle}>Abilities</div>
        <div style={{ ...card, padding: '4px 14px' }}>
          {u.abilities.map((ab, i) => {
            const text = abilityText(data, ab);
            return (
              <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid #26211c' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: BARLOW, fontSize: 13.5, fontWeight: 700, color: '#ddd6c8' }}>{ab.name}</div>
                  {ab.type !== 'Datasheet' && (
                    <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: '#7d7566', textTransform: 'uppercase', flexShrink: 0 }}>{ab.type}</span>
                  )}
                </div>
                {text && (
                  <div style={{ fontFamily: BARLOW, fontSize: 12.5, color: '#9c9484', lineHeight: 1.45, marginTop: 3, whiteSpace: 'pre-wrap' }}>{text}</div>
                )}
              </div>
            );
          })}
          {u.damagedText && (
            <div style={{ padding: '11px 0' }}>
              <div style={{ fontFamily: BARLOW, fontSize: 13.5, fontWeight: 700, color: '#e0937f' }}>Damaged: {u.damagedW}</div>
              <div style={{ fontFamily: BARLOW, fontSize: 12.5, color: '#9c9484', lineHeight: 1.45, marginTop: 3, whiteSpace: 'pre-wrap' }}>{u.damagedText}</div>
            </div>
          )}
        </div>

        {(u.comp.length > 0 || u.loadout || u.transport) && (
          <>
            <div style={sectionTitle}>Unit Composition</div>
            <div style={{ ...card, padding: '10px 14px' }}>
              {u.comp.map((c, i) => (
                <div key={i} style={{ fontFamily: BARLOW, fontSize: 12.5, color: '#b3ab9a', lineHeight: 1.5, padding: '2px 0' }}>
                  • {c}
                </div>
              ))}
              {u.loadout && (
                <div style={{ fontFamily: BARLOW, fontSize: 12.5, color: '#9c9484', lineHeight: 1.5, marginTop: 8, whiteSpace: 'pre-wrap' }}>{u.loadout}</div>
              )}
              {u.transport && (
                <div style={{ fontFamily: BARLOW, fontSize: 12.5, color: '#9c9484', lineHeight: 1.5, marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  <b style={{ color: '#b3ab9a' }}>Transport:</b> {u.transport}
                </div>
              )}
            </div>
          </>
        )}

        <div style={sectionTitle}>Keywords</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[...u.keywords, ...u.factionKw].map((k) => (
            <span key={k} style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', color: '#a89f8d', background: '#1f1b17', border: '1px solid #352e27', borderRadius: 5, padding: '5px 9px' }}>
              {k}
            </span>
          ))}
        </div>

        <div style={sectionTitle}>Points</div>
        <div style={{ ...card, padding: '4px 14px', marginBottom: 16 }}>
          {u.costs.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #26211c' }}>
              <span style={{ fontFamily: BARLOW, fontSize: 13, color: '#b3ab9a' }}>{b.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#d8cfbd' }}>{b.pts} PTS</span>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <div style={{ padding: '12px 16px 32px', background: 'rgba(14,12,10,0.95)', borderTop: '1px solid #2b2620', display: 'flex', gap: 8 }}>
          {u.costs.map((b, i) => (
            <button key={i} onClick={() => onAdd(i)} style={{ ...primaryBtn, flex: 1, minHeight: 50, fontSize: 11, letterSpacing: 0.5, lineHeight: 1.5 }}>
              + {b.label.toUpperCase()} · {b.pts} PTS
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= army detail =================

function ArmyDetail(props: {
  army: Army;
  playerName: string;
  data: EditionData;
  unitById: Map<string, WUnit>;
  expandedEntry: string | null;
  confirmDel: boolean;
  onBack: () => void;
  onToggleEntry: (id: string) => void;
  onUpdate: (fn: (a: Army) => Army) => void;
  onOpenPicker: () => void;
  onOpenExport: () => void;
  onViewSheet: (u: WUnit) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { army, unitById } = props;
  const total = armyTotal(army, unitById);
  const over = total > army.limit;
  const remaining = army.limit - total;
  const pct = army.limit > 0 ? Math.min(100, (total / army.limit) * 100) : 100;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '62px 16px 0' }}>
        <button onClick={props.onBack} style={backBtn}>
          ‹ {props.playerName}
        </button>
        <div style={{ fontFamily: OSWALD, fontSize: 22, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#e6dfd0' }}>{army.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: '#857c6c', textTransform: 'uppercase', marginTop: 2 }}>
          {army.faction} · {army.edition}th edition · {army.limit} pt limit
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 110px' }}>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: '#e6dfd0' }}>{total}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: '#7d7566' }}>/</span>
              <input
                value={String(army.limit)}
                onChange={(e) => {
                  const v = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                  props.onUpdate((a) => ({ ...a, limit: v }));
                }}
                inputMode="numeric"
                style={{ width: 62, padding: '4px 6px', background: '#14110f', border: '1px solid #302a24', borderRadius: 6, color: '#d8cfbd', fontFamily: MONO, fontSize: 13, textAlign: 'center' }}
              />
              <span style={{ fontFamily: MONO, fontSize: 11, color: '#7d7566' }}>PTS</span>
            </div>
            <span
              style={{
                fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
                color: over ? '#e0674f' : '#7fa088',
                background: over ? '#2a1210' : '#15201a',
                border: '1px solid ' + (over ? '#6e2018' : '#28382e'),
                borderRadius: 999, padding: '6px 10px',
              }}
            >
              {over ? `${total - army.limit} OVER` : `${remaining} PTS LEFT`}
            </span>
          </div>
          <div style={{ height: 6, background: '#26211c', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: over ? '#d94f35' : 'linear-gradient(90deg, #8c1f1a, #b5493c)', borderRadius: 999 }} />
          </div>
          {over && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#2a1210', border: '1px solid #6e2018', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#e0674f', fontSize: 14 }}>⚠</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 0.5, color: '#e0937f', textTransform: 'uppercase' }}>
                Over limit by {total - army.limit} pts — trim the roster
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={props.onOpenPicker} style={{ ...primaryBtn, flex: 1.4, minHeight: 46 }}>+ Add Units</button>
          <button onClick={props.onDuplicate} style={{ ...secondaryBtn, flex: 1, minHeight: 46 }}>Duplicate</button>
          <button onClick={props.onOpenExport} style={{ ...secondaryBtn, flex: 1, minHeight: 46 }}>Export</button>
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: '#7d7566', textTransform: 'uppercase', margin: '18px 2px 8px' }}>
          {army.entries.length} units in roster
        </div>

        {army.entries.map((e) => {
          const u = unitById.get(e.unitId);
          if (!u) return null;
          const b = u.costs[Math.min(e.sizeIdx, u.costs.length - 1)];
          const expanded = props.expandedEntry === e.id;
          const choices = weaponChoices(u);
          const selWeapons = e.weapons ?? [];
          return (
            <div key={e.id} style={{ ...card, marginBottom: 8, overflow: 'hidden' }}>
              <button
                onClick={() => props.onToggleEntry(e.id)}
                style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '12px 14px', minHeight: 56, cursor: 'pointer', gap: 10, color: '#ddd6c8', fontFamily: BARLOW }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: OSWALD, fontSize: 14, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: '#e6dfd0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {e.qty > 1 ? `${e.qty}× ` : ''}{u.name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.4, color: '#857c6c', marginTop: 3, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.label} · {b.pts} pts ea{selWeapons.length ? ' · ⚔ ' + selWeapons.join(', ') : ''}
                  </div>
                </div>
                {!!e.notes && !expanded && <span style={{ fontSize: 11, color: '#8a7350' }}>✎</span>}
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#d8cfbd', flexShrink: 0 }}>{b.pts * e.qty}</span>
              </button>
              {expanded && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid #26211c' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {u.costs.map((opt, i) => (
                        <button
                          key={i}
                          style={chip(e.sizeIdx === i, { padding: '7px 10px', minHeight: 32 })}
                          onClick={() => props.onUpdate((a) => ({ ...a, entries: a.entries.map((x) => (x.id === e.id ? { ...x, sizeIdx: i } : x)) }))}
                        >
                          {opt.label} · {opt.pts}pts
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #352e27', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                      <button onClick={() => props.onUpdate((a) => ({ ...a, entries: a.entries.map((x) => (x.id === e.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x)) }))} style={qtyBtn}>−</button>
                      <div style={{ width: 34, textAlign: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#e6dfd0' }}>{e.qty}</div>
                      <button onClick={() => props.onUpdate((a) => ({ ...a, entries: a.entries.map((x) => (x.id === e.id ? { ...x, qty: x.qty + 1 } : x)) }))} style={qtyBtn}>+</button>
                    </div>
                  </div>

                  {choices.length > 1 && (
                    <>
                      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.2, color: '#7d7566', textTransform: 'uppercase', margin: '12px 2px 6px' }}>Weapons</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {choices.map((wName) => {
                          const sel = selWeapons.includes(wName);
                          return (
                            <button
                              key={wName}
                              style={chip(sel, { padding: '7px 10px', minHeight: 32, textTransform: 'none', letterSpacing: 0.3 })}
                              onClick={() =>
                                props.onUpdate((a) => ({
                                  ...a,
                                  entries: a.entries.map((x) =>
                                    x.id === e.id
                                      ? { ...x, weapons: sel ? (x.weapons ?? []).filter((n) => n !== wName) : [...(x.weapons ?? []), wName] }
                                      : x,
                                  ),
                                }))
                              }
                            >
                              {wName}
                            </button>
                          );
                        })}
                      </div>
                      {u.options.length > 0 && (
                        <div style={{ fontFamily: BARLOW, fontSize: 11.5, color: '#7d7566', lineHeight: 1.5, marginTop: 8 }}>
                          {u.options.map((o, i) => (
                            <div key={i} style={{ whiteSpace: 'pre-wrap' }}>◆ {o}</div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <textarea
                    value={e.notes}
                    onChange={(ev) => props.onUpdate((a) => ({ ...a, entries: a.entries.map((x) => (x.id === e.id ? { ...x, notes: ev.target.value } : x)) }))}
                    placeholder="Wargear, enhancements, notes…"
                    rows={2}
                    style={{ width: '100%', marginTop: 10, padding: '10px 12px', background: '#14110f', border: '1px solid #2b2620', borderRadius: 8, color: '#cfc7b6', fontFamily: BARLOW, fontSize: 13, resize: 'vertical', lineHeight: 1.4 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <button onClick={() => props.onViewSheet(u)} style={{ background: 'none', border: 'none', padding: '8px 0', color: '#97907f', fontFamily: MONO, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
                      View datasheet ›
                    </button>
                    <button onClick={() => props.onUpdate((a) => ({ ...a, entries: a.entries.filter((x) => x.id !== e.id) }))} style={{ background: 'none', border: 'none', padding: '8px 0', color: '#b5493c', fontFamily: MONO, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: '#7d7566', textTransform: 'uppercase', margin: '18px 2px 8px' }}>Army Notes</div>
        <textarea
          value={army.notes}
          onChange={(e) => props.onUpdate((a) => ({ ...a, notes: e.target.value }))}
          placeholder="Strategy, matchup notes, reminders…"
          rows={3}
          style={{ width: '100%', padding: 12, background: '#1b1815', border: '1px solid #2b2620', borderRadius: 12, color: '#cfc7b6', fontFamily: BARLOW, fontSize: 13, resize: 'vertical', lineHeight: 1.4 }}
        />
        <button
          onClick={props.onDelete}
          style={{ width: '100%', minHeight: 48, marginTop: 16, background: 'transparent', border: '1px solid #58231c', borderRadius: 12, color: '#c05243', fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          {props.confirmDel ? 'Tap again to confirm delete' : 'Delete Army'}
        </button>
      </div>
    </div>
  );
}

// ================= unit picker =================

function UnitPicker(props: {
  army: Army;
  data: EditionData;
  unitById: Map<string, WUnit>;
  query: string;
  setQuery: (q: string) => void;
  onOpenDetail: (u: WUnit) => void;
  onQuickAdd: (id: string) => void;
  onClose: () => void;
}) {
  const { army } = props;
  const q = props.query.trim().toLowerCase();
  const avail = props.data.units.filter((u) => u.faction === army.faction && (!q || u.name.toLowerCase().includes(q)));
  const total = armyTotal(army, props.unitById);
  const over = total > army.limit;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 25, display: 'flex', flexDirection: 'column', background: screenBg }}>
      <div style={{ padding: '62px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: OSWALD, fontSize: 20, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#e6dfd0' }}>Add Units</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 0.8, color: '#857c6c', textTransform: 'uppercase', marginTop: 2 }}>
              {army.name} · {army.faction}
            </div>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: over ? '#e0674f' : '#d8cfbd', background: '#1b1815', border: '1px solid ' + (over ? '#6e2018' : '#352e27'), borderRadius: 999, padding: '8px 12px' }}>
            {total}/{army.limit}
          </span>
        </div>
        <input
          value={props.query}
          onChange={(e) => props.setQuery(e.target.value)}
          placeholder="Search faction units…"
          style={{ ...searchInput, margin: '12px 0 10px' }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 16px 12px' }}>
        {avail.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, ...card, padding: '10px 10px 10px 14px', marginBottom: 8 }}>
            <button onClick={() => props.onOpenDetail(u)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', color: '#ddd6c8', fontFamily: BARLOW }}>
              <div style={{ fontFamily: OSWALD, fontSize: 14, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: '#e6dfd0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.name}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.4, color: '#857c6c', marginTop: 3, textTransform: 'uppercase' }}>
                {unitType(u)} · from {u.costs[0]?.pts ?? 0} pts
              </div>
            </button>
            <button onClick={() => props.onQuickAdd(u.id)} style={{ width: 46, height: 46, flexShrink: 0, background: '#8c1f1a', border: '1px solid #a5352c', borderRadius: 10, color: '#f2ddd4', fontSize: 22, fontWeight: 400, cursor: 'pointer', lineHeight: 1 }}>
              +
            </button>
          </div>
        ))}
        {avail.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6f6759', fontFamily: MONO, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
            No units match
          </div>
        )}
      </div>
      <div style={{ padding: '12px 16px 32px', background: 'rgba(14,12,10,0.95)', borderTop: '1px solid #2b2620' }}>
        <button onClick={props.onClose} style={{ width: '100%', minHeight: 50, background: '#1b1815', border: '1px solid #3a332b', borderRadius: 10, color: '#ddd6c8', fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>
          Done
        </button>
      </div>
    </div>
  );
}

// ================= tab bar =================

function TabBar({ tab, onData, onRoster }: { tab: 'data' | 'roster'; onData: () => void; onRoster: () => void }) {
  const dataColor = tab === 'data' ? '#cf5240' : '#6b6457';
  const rosterColor = tab === 'roster' ? '#cf5240' : '#6b6457';
  const lbl = (active: boolean): CSSProperties => ({
    fontFamily: MONO, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: active ? '#e5a89a' : '#6b6457',
  });
  const btn: CSSProperties = { flex: 1, minHeight: 48, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 6 };
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, display: 'flex', padding: '8px 24px 30px', background: 'rgba(14,12,10,0.92)', backdropFilter: 'blur(14px)', borderTop: '1px solid #26211c' }}>
      <button onClick={onData} style={btn}>
        <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
          <rect x="3" y="2.5" width="15" height="16" rx="2" stroke={dataColor} strokeWidth="1.8" />
          <line x1="6.5" y1="7" x2="14.5" y2="7" stroke={dataColor} strokeWidth="1.8" />
          <line x1="6.5" y1="10.5" x2="14.5" y2="10.5" stroke={dataColor} strokeWidth="1.8" />
          <line x1="6.5" y1="14" x2="11" y2="14" stroke={dataColor} strokeWidth="1.8" />
        </svg>
        <span style={lbl(tab === 'data')}>Datasheets</span>
      </button>
      <button onClick={onRoster} style={btn}>
        <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
          <circle cx="10.5" cy="6.5" r="3.5" stroke={rosterColor} strokeWidth="1.8" />
          <path d="M3.5 18.5c0-3.6 3.1-6 7-6s7 2.4 7 6" stroke={rosterColor} strokeWidth="1.8" />
        </svg>
        <span style={lbl(tab === 'roster')}>Army Builder</span>
      </button>
    </div>
  );
}

// ================= modals =================

function ModalCenter({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(6,5,4,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', background: '#1d1a16', border: '1px solid #3a332b', borderRadius: 16, padding: 20, ...(scroll ? { maxHeight: '80%', overflowY: 'auto' } : {}) }}>
        {children}
      </div>
    </div>
  );
}

// ================= shared styles =================

const searchInput: CSSProperties = {
  width: '100%', marginTop: 14, padding: '12px 14px', minHeight: 44,
  background: '#1b1815', border: '1px solid #302a24', borderRadius: 10,
  color: '#ddd6c8', fontFamily: BARLOW, fontSize: 15,
};

const factionBtn: CSSProperties = {
  width: '100%', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '11px 14px', minHeight: 42, background: '#1b1815', border: '1px solid #302a24', borderRadius: 10,
  color: '#c4bba8', fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer',
};

const factionRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
  background: 'none', border: 'none', borderBottom: '1px solid #221e19', padding: '14px 2px', minHeight: 50, cursor: 'pointer',
};

const dashedBtn: CSSProperties = {
  width: '100%', minHeight: 52, background: 'transparent', border: '1px dashed #43392f', borderRadius: 12,
  color: '#97907f', fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
};

const backBtn: CSSProperties = {
  background: 'none', border: 'none', padding: '8px 0', color: '#97907f',
  fontFamily: MONO, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
};

const primaryBtn: CSSProperties = {
  background: '#8c1f1a', border: '1px solid #a5352c', borderRadius: 10, color: '#f2ddd4',
  fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
  flex: 1, minHeight: 46,
};

const secondaryBtn: CSSProperties = {
  background: '#1b1815', border: '1px solid #3a332b', borderRadius: 10, color: '#b3ab9a',
  fontFamily: MONO, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
};

const cancelBtn: CSSProperties = {
  flex: 1, minHeight: 46, background: 'none', border: '1px solid #3a332b', borderRadius: 10, color: '#97907f',
  fontFamily: MONO, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
};

const modalInput: CSSProperties = {
  width: '100%', padding: '12px 14px', minHeight: 44, background: '#14110f', border: '1px solid #302a24',
  borderRadius: 10, color: '#ddd6c8', fontFamily: BARLOW, fontSize: 15,
};

const qtyBtn: CSSProperties = {
  width: 42, height: 40, background: '#211d18', border: 'none', color: '#b3ab9a', fontSize: 18, cursor: 'pointer',
};

const modalLabel: CSSProperties = {
  fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.2, color: '#7d7566', textTransform: 'uppercase', margin: '14px 2px 8px',
};
