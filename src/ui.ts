import type { CSSProperties } from 'react';

export const MONO = "'IBM Plex Mono', monospace";
export const OSWALD = 'Oswald, sans-serif';
export const BARLOW = 'Barlow, sans-serif';

export function chip(sel: boolean, extra?: CSSProperties): CSSProperties {
  return {
    padding: '8px 13px',
    minHeight: 34,
    borderRadius: 999,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    border: sel ? '1px solid #8c352c' : '1px solid #322c26',
    background: sel ? '#301511' : '#1b1815',
    color: sel ? '#e5a89a' : '#97907f',
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    cursor: 'pointer',
    ...extra,
  };
}

export function segBtn(sel: boolean): CSSProperties {
  return {
    padding: '8px 14px',
    minHeight: 36,
    border: 'none',
    background: sel ? '#301511' : '#1b1815',
    color: sel ? '#e5a89a' : '#7d7566',
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase',
    cursor: 'pointer',
  };
}

export function stripe(color: string): CSSProperties {
  return {
    width: 4,
    flexShrink: 0,
    alignSelf: 'stretch',
    background: `linear-gradient(180deg, ${color}, ${color}88)`,
  };
}

export const sectionTitle: CSSProperties = {
  fontFamily: OSWALD,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 2,
  color: '#b5493c',
  textTransform: 'uppercase',
  margin: '18px 2px 8px',
};

export const card: CSSProperties = {
  background: '#1b1815',
  border: '1px solid #2b2620',
  borderRadius: 12,
};

export const screenBg =
  'repeating-linear-gradient(135deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 2px, transparent 2px, transparent 7px), linear-gradient(180deg, #141110 0%, #100e0c 100%)';
