import { FACTION_ICONS } from './factionIcons';
import { factionColor } from './factions';

/** Normalize typographic apostrophes so Wahapedia names match map keys. */
function norm(name: string): string {
  return name.replace(/[’`]/g, "'");
}

/**
 * Faction symbol tinted with the faction's accent color (or an explicit
 * `color`). Falls back to the color-dot used before icons existed when the
 * faction has no symbol (e.g. Unaligned Forces).
 */
export function FactionIcon({ faction, size = 16, color }: { faction: string; size?: number; color?: string }) {
  const def = FACTION_ICONS[norm(faction)];
  const tint = color ?? factionColor(faction);
  if (!def) {
    const dot = Math.max(8, Math.round(size * 0.62));
    return <span style={{ width: dot, height: dot, borderRadius: 3, background: tint, flexShrink: 0 }} />;
  }
  return (
    <svg
      viewBox={def.viewBox}
      width={size}
      height={size}
      style={{ color: tint, flexShrink: 0 }}
      fill="currentColor"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: def.markup }}
    />
  );
}
