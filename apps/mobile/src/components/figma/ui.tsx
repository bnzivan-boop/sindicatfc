/**
 * Примитивы по макету Figma «сфк»: типографика (Fira Sans Extra Condensed / Inter Tight),
 * заголовок секции с подчёркнутой ссылкой, лаймовый чип. Токены — src/theme/figma.ts.
 */
import { Pressable, Text, View, type TextProps } from 'react-native';
import { figma, figmaFont, figmaSurfaces, type FigmaSurfaces } from '../../theme/figma';
import { useTheme } from '../../theme/useTheme';

export function useFigmaSurfaces(): FigmaSurfaces {
  const { scheme } = useTheme();
  return figmaSurfaces[scheme];
}

type TextBase = TextProps & { size: number; color: string; lineHeight?: number; /** letterSpacing; по умолчанию −4% от кегля, как в макете */ tracking?: number };

/** Fira Sans Extra Condensed SemiBold — заголовки секций, названия, крупные цифры. */
export function Display({ size, color, lineHeight, tracking, style, ...rest }: TextBase) {
  return <Text {...rest} style={[{ fontFamily: figmaFont.display, fontSize: size, lineHeight: lineHeight ?? size * 1.1, letterSpacing: tracking ?? size * -0.04, color }, style]} />;
}

/** Inter Tight — текст. Для regular трекинг по макету нулевой, для medium/semibold −4%. */
export function Body({ size, color, lineHeight, tracking, weight = 'regular', style, ...rest }: TextBase & { weight?: 'regular' | 'medium' | 'semibold' }) {
  return <Text {...rest} style={[{ fontFamily: figmaFont[weight], fontSize: size, lineHeight: lineHeight ?? Math.round(size * 1.21), letterSpacing: tracking ?? (weight === 'regular' ? 0 : size * -0.04), color }, style]} />;
}

/** «Ближайший старт — Все турниры»: Fira 24/30 + подчёркнутая ссылка Inter Tight Medium 10. */
export function SectionHeader({ title, action, onAction, color = '#FFFFFF' }: { title: string; action?: string; onAction?: () => void; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Display size={24} lineHeight={30} color={color}>{title}</Display>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Body size={10} lineHeight={10} weight="medium" color={figma.linkMuted} style={{ textDecorationLine: 'underline' }}>{action}</Body>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Лаймовый чип «Регистрация открыта» / «Трофей». */
export function LimeChip({ children, radius = 5, size = 8, paddingH = 4, paddingV = 4 }: { children: string; radius?: number; size?: number; paddingH?: number; paddingV?: number }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: figma.lime, borderRadius: radius, paddingHorizontal: paddingH, paddingVertical: paddingV }}>
      <Body size={size} lineHeight={Math.round(size * 1.21)} weight="medium" color="#000000">{children}</Body>
    </View>
  );
}
