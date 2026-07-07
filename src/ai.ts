// Rules-tab AI assistant backed by the NVIDIA Build API (OpenAI-compatible
// chat completions). integrate.api.nvidia.com blocks browser CORS, so requests
// go through a proxy: the vite dev proxy (`/nvapi`) during development, or
// `scripts/ai-proxy.mjs` (npm run ai-proxy) anywhere else. Answers are
// grounded in retrieved rule sections / datasheets and cite them as [n].

import type { EditionData, RulesData, WUnit } from './types';
import { abilityText, plus, weaponAbilityRule } from './data';

export interface AiSettings {
  endpoint: string;
  apiKey: string;
  model: string;
}

const SETTINGS_KEY = 'ttr-ai-v1';

export const DEFAULT_AI: AiSettings = {
  endpoint: import.meta.env.DEV ? '/nvapi/v1/chat/completions' : 'http://localhost:8787/v1/chat/completions',
  apiKey: '',
  model: 'minimaxai/minimax-m3',
};

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_AI, ...(JSON.parse(raw) as Partial<AiSettings>) };
  } catch {
    // corrupted storage — fall through to defaults
  }
  return { ...DEFAULT_AI };
}

export function saveAiSettings(s: AiSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // quota exceeded — keep in memory
  }
}

// ---- Retrieval over the local database ----

export interface AiRef {
  id: number; // 1-based citation number
  source: string; // e.g. 'Core Rules', 'Abilities', 'Datasheet'
  title: string;
  text: string;
}

const STOPWORDS = new Set(['the', 'and', 'can', 'has', 'have', 'how', 'what', 'when', 'does', 'with', 'for', 'are', 'you', 'unit', 'units', 'model', 'models', 'rule', 'rules', 'phase', 'this', 'that', 'its', 'get', 'use']);

function tokens(q: string): string[] {
  return (q.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function countOccurrences(hay: string, needle: string): number {
  let n = 0;
  let i = hay.indexOf(needle);
  while (i !== -1 && n < 8) { n++; i = hay.indexOf(needle, i + needle.length); }
  return n;
}

/** Compact plain-text datasheet used as assistant context. */
export function sheetText(u: WUnit, data: EditionData): string {
  const lines: string[] = [];
  lines.push(`${u.name} (${u.faction})`);
  for (const m of u.models) {
    lines.push(`Profile ${m.name}: M ${m.M}, T ${m.T}, Sv ${plus(m.Sv)}${m.inv && m.inv !== '-' ? ` (invuln ${plus(m.inv)})` : ''}, W ${m.W}, Ld ${plus(m.Ld)}, OC ${m.OC}`);
  }
  lines.push('Points: ' + u.costs.map((c) => `${c.label} = ${c.pts} pts`).join('; '));
  for (const w of u.weapons) {
    lines.push(`${w.type === 'R' ? 'Ranged' : 'Melee'} weapon ${w.name}: range ${w.range}, A ${w.A}, ${w.type === 'R' ? 'BS' : 'WS'} ${plus(w.skill)}, S ${w.S}, AP ${w.AP}, D ${w.D}${w.abils.length ? ` [${w.abils.join(', ')}]` : ''}`);
  }
  for (const ab of u.abilities) {
    const text = abilityText(data, ab);
    lines.push(`Ability ${ab.name}${text ? `: ${text.slice(0, 350)}` : ''}`);
  }
  if (u.damagedText) lines.push(`Damaged (${u.damagedW}): ${u.damagedText}`);
  if (u.transport) lines.push(`Transport: ${u.transport}`);
  if (u.options.length) lines.push('Wargear options: ' + u.options.join(' | '));
  lines.push('Keywords: ' + [...u.keywords, ...u.factionKw].join(', '));
  return lines.join('\n');
}

/**
 * Score rule sections and datasheets against the question and return the
 * top matches as numbered context chunks.
 */
export function retrieve(question: string, rules: RulesData | null, data: EditionData | null): AiRef[] {
  const toks = tokens(question);
  const ql = question.toLowerCase();
  const refs: AiRef[] = [];

  const scoredRules = (rules?.sections ?? [])
    .map((s) => {
      const tl = s.title.toLowerCase();
      const xl = s.text.toLowerCase();
      let score = 0;
      if (ql.includes(tl) || tl.includes(ql)) score += 30;
      for (const t of toks) {
        if (tl.includes(t)) score += 8;
        score += Math.min(countOccurrences(xl, t), 4) * 1.5;
      }
      return { s, score };
    })
    .filter((x) => x.score > 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const scoredUnits = (data?.units ?? [])
    .map((u) => {
      const nl = u.name.toLowerCase();
      let score = 0;
      if (ql.includes(nl)) score += 60;
      for (const t of toks) if (nl.includes(t)) score += 12;
      return { u, score };
    })
    .filter((x) => x.score >= 24)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  let id = 1;
  for (const { s } of scoredRules) {
    refs.push({ id: id++, source: s.src, title: s.title, text: s.text.slice(0, 2600) });
  }
  for (const { u } of scoredUnits) {
    refs.push({ id: id++, source: 'Datasheet', title: u.name, text: data ? sheetText(u, data).slice(0, 2600) : '' });
  }
  return refs;
}

/** Resolve a weapon-ability mention like 'lethal hits' as an extra ref if useful. */
export function weaponAbilityRef(question: string, data: EditionData | null, startId: number): AiRef | null {
  if (!data) return null;
  const rule = weaponAbilityRule(data, question);
  if (!rule) return null;
  return { id: startId, source: 'Weapon Abilities', title: `[${rule.name}]`, text: rule.text };
}

// ---- Chat completion ----

export async function askAi(settings: AiSettings, edition: number, question: string, refs: AiRef[], signal?: AbortSignal): Promise<string> {
  const context = refs.map((r) => `[${r.id}] (${r.source} — ${r.title})\n${r.text}`).join('\n\n');
  const system =
    `You are a concise Warhammer 40,000 rules assistant helping players mid-game. The players use ${edition}th edition. ` +
    `Answer ONLY from the numbered context blocks. Cite the blocks you used inline like [1] or [2][3]. ` +
    `If the context does not contain the answer, say so plainly and suggest what to search for. Keep answers short and practical.`;
  const body = {
    model: settings.model,
    temperature: 0.2,
    max_tokens: 1024,
    stream: false,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `CONTEXT:\n${context || '(no matching context found)'}\n\nQUESTION: ${question}` },
    ],
  };
  let res: Response;
  try {
    res = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(settings.apiKey ? { authorization: `Bearer ${settings.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    throw new Error(
      `Could not reach ${settings.endpoint} — the NVIDIA API blocks direct browser calls, so a proxy is required. ` +
        `Run "npm run ai-proxy" (reads NVIDIA_API_KEY from .env) or check the endpoint in AI settings. (${e instanceof Error ? e.message : String(e)})`,
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const answer = json.choices?.[0]?.message?.content;
  if (!answer) throw new Error('The API returned no answer.');
  // Some reasoning models wrap deliberation in <think> tags — show only the answer.
  return answer.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}
