/**
 * Дизайн-токены. light — по макету Figma «сфк» (белый фон, карточки #F9F9F9/#E9E9E9, тёмные блоки #212121/#363636,
 * лайм #C3FD56); dark — палитра старого HTML-прототипа, оставлена на будущее (тема зафиксирована светлой, см. useTheme).
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
  /** Текст на лаймовом фоне. */
  onLime: string;
  /** Тёмная карточка внутри тёмного блока (#363636 в макете). */
  card: string;
}

export const palette: Record<'light' | 'dark', Palette> = {
  // green в макете нет — акцентный текст/обводки чёрные (#212121), лайм используется только заливкой
  light: { bg: '#FFFFFF', surface: '#F9F9F9', surface2: '#E9E9E9', line: '#E4E4E4', text: '#000000', muted: '#838383', green: '#212121', deep: '#212121', lime: '#C3FD56', orange: '#ff713d', white: '#FFFFFF', onLime: '#000000', card: '#363636' },
  dark: { bg: '#0f1210', surface: '#181c19', surface2: '#232925', line: '#2b332e', text: '#f2f7f3', muted: '#96a098', green: '#63d3a3', deep: '#173d31', lime: '#d9ff63', orange: '#ff713d', white: '#f8fff9', onLime: '#102118', card: '#232925' },
};

/** Полупрозрачный белый на тёмных блоках. */
export const whiteAlpha = (pct: number) => `rgba(255,255,255,${pct / 100})`;

export const PAGE_PADDING = 16;
