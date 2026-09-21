import { palette, type Palette } from './tokens';

/**
 * Макет Figma светлый (белый фон, тёмный только хедер главной и нижнее меню), тёмной темы в нём нет —
 * поэтому тема приложения зафиксирована светлой независимо от системной. Палитра dark сохранена на будущее.
 */
export function useTheme(): { colors: Palette; scheme: 'light' | 'dark' } {
  return { colors: palette.light, scheme: 'light' };
}
