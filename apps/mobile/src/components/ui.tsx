/**
 * UI-кит в стиле макета Figma «сфк»: Inter Tight для текста, Fira Sans Extra Condensed для заголовков и цифр,
 * карточки без обводок, тёмные блоки #212121/#363636, лаймовые чипы и кнопки. Имена компонентов сохранены
 * от HTML-прототипа, чтобы экраны не переписывать.
 */
import type { LucideIcon } from 'lucide-react-native';
import { useContext, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type PressableProps, type TextProps, type ViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import LogoS from '../../assets/figma/logo-s.svg';
import { figmaFont } from '../theme/figma';
import { PAGE_PADDING, whiteAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Inter Tight Regular — базовый текст. Для жирного нужна отдельная гарнитура (fontMedium/fontSemi), fontWeight на native не работает. */
const FONT = { fontFamily: figmaFont.regular } as const;
export const fontFamily = FONT;
export const fontMedium = { fontFamily: figmaFont.medium } as const;
export const fontSemi = { fontFamily: figmaFont.semibold } as const;
/** Fira Sans Extra Condensed SemiBold — заголовки, названия, крупные цифры; трекинг −4 % задавать по месту. */
export const fontDisplay = { fontFamily: figmaFont.display } as const;

/* ── страница ── */

/** .page — прокручиваемый контейнер с отступами 16px и safe-area сверху. */
export function Page({ children, contentStyle }: PropsWithChildren<{ contentStyle?: ViewStyle }>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Плавающее нижнее меню (FigmaTabBar) не занимает место в раскладке — добавляем его высоту к отступу снизу
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[{ padding: PAGE_PADDING, paddingTop: insets.top + 16, paddingBottom: 24 + tabBar }, contentStyle]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

/** .topbar — бренд слева, круглые кнопки справа. */
export function TopBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 35, marginBottom: 21 }}>{left}{right ? <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>{right}</View> : null}</View>;
}

/** Логотип S из макета + подпись локации. */
export function Brand({ location, light }: { location?: string; light?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <LogoS width={64} height={28} color={light ? '#FFFFFF' : colors.text} />
      {location ? <Text style={[FONT, { fontSize: 10, color: light ? whiteAlpha(40) : colors.muted }]}>{location}</Text> : null}
    </View>
  );
}

/** .detail-topbar — назад · подпись · действие */
export function DetailTopBar({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 10 }}>
      {left ?? <View style={{ width: 40 }} />}
      <Text style={[fontMedium, { fontSize: 11, color: colors.muted }]}>{title}</Text>
      {right ?? <View style={{ width: 40 }} />}
    </View>
  );
}

/** .round — круглая иконка-кнопка */
export function Round({ icon: Icon, notice, light, ...rest }: PressableProps & { icon: LucideIcon; notice?: boolean; light?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable {...rest} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: light ? whiteAlpha(12) : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={17} color={light ? '#FFFFFF' : colors.text} strokeWidth={1.7} />
      {notice && <View style={{ position: 'absolute', right: 5, top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime }} />}
    </Pressable>
  );
}

/** .page-title — Fira 32 */
export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 16 }}>
      <View style={{ flex: 1 }}>
        <Text style={[fontDisplay, { fontSize: 32, lineHeight: 32, letterSpacing: -1.28, color: colors.text }]}>{cap(title)}</Text>
        {subtitle ? <Text style={[FONT, { fontSize: 11, color: colors.muted, marginTop: 4 }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** .section-head — Fira 24/30 + подчёркнутая ссылка или чип справа */
export function SectionHead({ title, action, onAction, tag }: { title: string; action?: string; onAction?: () => void; tag?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 }}>
      <Text style={[fontDisplay, { fontSize: 24, lineHeight: 30, letterSpacing: -0.96, color: colors.text }]}>{cap(title)}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={[fontMedium, { fontSize: 10, lineHeight: 10, letterSpacing: -0.4, color: colors.muted, textDecorationLine: 'underline' }]}>{cap(action)}</Text></Pressable> : tag ? <EventTag>{tag}</EventTag> : null}
    </View>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ── типографика ── */

const WEIGHT_FONT = { '400': figmaFont.regular, '500': figmaFont.medium, '600': figmaFont.semibold } as const;

export function T({ size = 11, muted, weight, color, style, ...rest }: TextProps & { size?: number; muted?: boolean; weight?: '400' | '500' | '600'; color?: string }) {
  const { colors } = useTheme();
  return <Text {...rest} style={[{ fontFamily: WEIGHT_FONT[weight ?? '400'], fontSize: size, letterSpacing: weight && weight !== '400' ? size * -0.04 : 0, color: color ?? (muted ? colors.muted : colors.text) }, style]} />;
}

/** .event-tag — лаймовый чип (plain — серый) */
export function EventTag({ children, plain }: PropsWithChildren<{ plain?: boolean }>) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: plain ? colors.surface2 : colors.lime, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 4 }}>
      <Text style={[fontMedium, { fontSize: 8, letterSpacing: -0.32, color: colors.onLime }]}>{cap(String(children))}</Text>
    </View>
  );
}

export function FilterRow<T extends string | undefined>({ items, value, onChange }: { items: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0 }} contentContainerStyle={{ gap: 4 }}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable key={String(it.value)} onPress={() => onChange(it.value)} style={{ backgroundColor: active ? colors.deep : colors.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={[fontMedium, { fontSize: 11, letterSpacing: -0.44, color: active ? colors.white : colors.text }]}>{cap(it.label)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** .chip — внутри тёмного блока */
export function Chip({ label, active }: { label: string; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 5, backgroundColor: active ? colors.lime : colors.card, paddingHorizontal: 6, paddingVertical: 4 }}>
      <Text style={[fontMedium, { fontSize: 10, letterSpacing: -0.4, color: active ? colors.onLime : colors.white }]}>{cap(label)}</Text>
    </View>
  );
}

/* ── карточки ── */

/** Тёмный блок #212121 (hero турнира, «мой сезон», live) */
export function DeepCard({ children, style, minHeight }: PropsWithChildren<{ style?: ViewStyle; minHeight?: number }>) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.deep, borderRadius: 20, padding: 16, overflow: 'hidden', minHeight }, style]}>{children}</View>;
}

/** .track + .fill */
export function Track({ pct }: { pct: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 5, backgroundColor: whiteAlpha(20), borderRadius: 99, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: colors.lime, borderRadius: 99 }} />
    </View>
  );
}

/** .surface — карточка #F9F9F9 без обводки (deep — #363636) */
export function Surface({ children, style, radius = 20, deep, ...rest }: ViewProps & { radius?: number; deep?: boolean }) {
  const { colors } = useTheme();
  return (
    <View {...rest} style={[{ backgroundColor: deep ? colors.card : colors.surface, borderRadius: radius, padding: 14 }, style]}>
      {children}
    </View>
  );
}

/** Бейдж даты как в карточке старта макета: тёмный блок, число Fira, месяц Inter Tight. inverted — светлый. */
export function DateBadge({ date, inverted }: { date: Date; inverted?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: 56, height: 68, backgroundColor: inverted ? colors.surface2 : '#6E6E6E', borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Text style={[fontDisplay, { fontSize: 36, lineHeight: 30, letterSpacing: -1.44, color: inverted ? colors.text : colors.white, marginTop: 4 }]}>{date.getDate()}</Text>
      <Text style={[fontMedium, { fontSize: 9, letterSpacing: -0.36, color: inverted ? colors.text : colors.white }]}>{cap(date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''))}</Text>
    </View>
  );
}

/** .status — лаймовый чип статуса */
export function Status({ children }: PropsWithChildren) {
  return <View style={{ alignSelf: 'flex-start', marginBottom: 6 }}><EventTag>{children}</EventTag></View>;
}

/** .stats + .stat — значения Fira */
export function Stats({ items }: { items: Array<{ label: string; value: string }> }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 18 }}>
      {items.map((s) => (
        <View key={s.label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10 }}>
          <Text style={[fontMedium, { fontSize: 8, letterSpacing: -0.32, color: colors.muted, marginBottom: 3 }]}>{s.label}</Text>
          <Text style={[fontDisplay, { fontSize: 24, lineHeight: 24, letterSpacing: -0.96, color: colors.text }]}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** .info-list + .info-row */
export function InfoList({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <View style={{ backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden', gap: 1 }}>{children}</View>;
}
export function InfoRow({ icon: Icon, label, value, action, onAction, onPress, trailing }: { icon: LucideIcon; label: string; value: string; action?: string; onAction?: () => void; onPress?: () => void; trailing?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ backgroundColor: colors.surface, flexDirection: 'row', gap: 11, alignItems: 'flex-start', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.bg }}>
      <Icon size={16} color={colors.text} strokeWidth={1.6} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[fontMedium, { fontSize: 8, letterSpacing: -0.32, color: colors.muted, marginBottom: 3 }]}>{label}</Text>
        <Text style={[fontSemi, { fontSize: 12, letterSpacing: -0.48, color: colors.text, lineHeight: 15 }]}>{value}</Text>
      </View>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={[fontMedium, { fontSize: 10, color: colors.muted, textDecorationLine: 'underline' }]}>{action}</Text></Pressable> : trailing}
    </Pressable>
  );
}

/** .detail-section — заголовок Fira 24 */
export function DetailSection({ title, children, text }: PropsWithChildren<{ title: string; text?: string }>) {
  const { colors } = useTheme();
  return (
    <View style={{ marginVertical: 10 }}>
      <Text style={[fontDisplay, { fontSize: 24, lineHeight: 30, letterSpacing: -0.96, color: colors.text, marginBottom: 8 }]}>{cap(title)}</Text>
      {text ? <Text style={[FONT, { fontSize: 12, lineHeight: 18, color: colors.text }]}>{text}</Text> : null}
      {children}
    </View>
  );
}

/** .rule-block — разрешено / запрещено */
export function RuleBlock({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  const { colors } = useTheme();
  return (
    <Surface radius={10} style={{ padding: 12, marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon size={14} color={colors.text} strokeWidth={1.6} />
        <Text style={[fontSemi, { fontSize: 12, letterSpacing: -0.48, color: colors.text }]}>{title}</Text>
      </View>
      {items.map((it) => (
        <Text key={it} style={[FONT, { fontSize: 11, lineHeight: 16, color: colors.text, paddingLeft: 10 }]}>• {it}</Text>
      ))}
    </Surface>
  );
}

/** .timeline + .time */
export function Timeline({ items }: { items: Array<{ time: string; title: string }> }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {items.map((t) => (
        <View key={t.time + t.title} style={{ flex: 1, borderTopWidth: 2, borderTopColor: colors.lime, paddingTop: 8 }}>
          <Text style={[fontDisplay, { fontSize: 20, lineHeight: 20, letterSpacing: -0.8, color: colors.text }]}>{t.time}</Text>
          <Text style={[FONT, { fontSize: 9, color: colors.muted }]}>{t.title}</Text>
        </View>
      ))}
    </View>
  );
}

/** .pathway + .path-step — sprint → qualifier → open → final */
export function Pathway({ steps, activeUntil }: { steps: Array<{ label: string; sub: string }>; activeUntil: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 10, marginBottom: 15 }}>
      {steps.map((s, i) => {
        const active = i <= activeUntil;
        return (
          <View key={s.label} style={{ flex: 1, backgroundColor: active ? colors.deep : colors.surface2, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center' }}>
            <Text style={[fontSemi, { fontSize: 10, letterSpacing: -0.4, color: active ? colors.white : colors.text }]}>{s.label}</Text>
            <Text style={[FONT, { fontSize: 8, color: active ? whiteAlpha(50) : colors.muted }]}>{s.sub}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** .avatar — инициалы; по умолчанию круг, в карточках макета radius 10 */
export function Avatar({ name, size = 34, lime, radius }: { name: string; size?: number; lime?: boolean; radius?: number }) {
  const { colors } = useTheme();
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size / 2, backgroundColor: lime ? colors.lime : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[fontSemi, { fontSize: size * 0.27, color: colors.onLime }]}>{initials || '—'}</Text>
    </View>
  );
}

/** Кнопка: primary — чёрная, обычная — серая #E9E9E9 */
export function ActionButton({ title, icon: Icon, primary, style, ...rest }: PressableProps & { title: string; icon?: LucideIcon; primary?: boolean; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <Pressable {...rest} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: primary ? colors.deep : colors.surface2, borderRadius: 10, padding: 12, opacity: pressed ? 0.8 : rest.disabled ? 0.5 : 1 }, style]}>
      {Icon && <Icon size={13} color={primary ? colors.white : colors.text} strokeWidth={1.6} />}
      <Text style={[fontSemi, { fontSize: 11, letterSpacing: -0.44, color: primary ? colors.white : colors.text }]}>{title}</Text>
    </Pressable>
  );
}

/** Лаймовая CTA-кнопка */
export function LimeButton({ title, style, ...rest }: PressableProps & { title: string; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <Pressable {...rest} style={({ pressed }) => [{ backgroundColor: colors.lime, borderRadius: 10, paddingVertical: 14, alignItems: 'center', opacity: pressed ? 0.85 : rest.disabled ? 0.5 : 1 }, style]}>
      <Text style={[fontSemi, { fontSize: 14, letterSpacing: -0.56, color: colors.onLime }]}>{title}</Text>
    </Pressable>
  );
}
