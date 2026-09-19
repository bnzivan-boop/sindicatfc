import { useColorScheme } from 'react-native';
import { palette, type Palette } from './tokens';

export function useTheme(): { colors: Palette; scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  return { colors: palette[scheme], scheme };
}
