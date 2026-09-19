/**
 * Дизайн-токены из HTML-прототипа (docs/sindikat-community-prototype.html, #fish-prototype).
 * Значения перенесены один в один; light/dark — из light-dark().
 */
export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  muted: string;
  green: string;
  deep: string;
  lime: string;
  orange: string;
  white: string;
  /** Текст на лаймовом фоне (#102118 в прототипе). */
  onLime: string;
}

export const palette: Record<'light' | 'dark', Palette> = {
  light: { bg: '#eef0eb', surface: '#ffffff', surface2: '#e4e8e1', line: '#d7dcd5', text: '#111512', muted: '#707970', green: '#174d3a', deep: '#103b2d', lime: '#d9ff63', orange: '#ff713d', white: '#f8fff9', onLime: '#102118' },
  dark: { bg: '#0f1210', surface: '#181c19', surface2: '#232925', line: '#2b332e', text: '#f2f7f3', muted: '#96a098', green: '#63d3a3', deep: '#173d31', lime: '#d9ff63', orange: '#ff713d', white: '#f8fff9', onLime: '#102118' },
};

/** Полупрозрачный белый на тёмных hero-карточках: color-mix(white N%). */
export const whiteAlpha = (pct: number) => `rgba(248,255,249,${pct / 100})`;

export const PAGE_PADDING = 16;
