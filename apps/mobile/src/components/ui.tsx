/**
 * UI-кит, перенесённый из CSS прототипа (#fish-prototype .*).
 * Имена компонентов повторяют классы прототипа, чтобы сверять один в один.
 */
import type { LucideIcon } from 'lucide-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type TextProps, type ViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAGE_PADDING, whiteAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const FONT = { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' } as const;

/* ── страница ── */

/** .page — прокручиваемый контейнер с отступами 16px и safe-area сверху. */
export function Page({ children, contentStyle }: PropsWithChildren<{ contentStyle?: ViewStyle }>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[{ padding: PAGE_PADDING, paddingTop: insets.top + 8, paddingBottom: 24 }, contentStyle]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

/** .topbar — бренд слева, круглые кнопки справа. */
export function TopBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 14 }}>{left}{right ? <View style={{ flexDirection: 'row', gap: 7 }}>{right}</View> : null}</View>;
}

/** .brand + .location */
export function Brand({ location }: { location?: string }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[FONT, { fontSize: 22, fontWeight: '500', letterSpacing: -1, color: colors.text }]}>синдикат</Text>
      {location ? <Text style={[FONT, { fontSize: 11, color: colors.muted }]}>{location}</Text> : null}
    </View>
  );
}

/** .detail-topbar — назад · подпись · действие */
export function DetailTopBar({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 10 }}>
      {left ?? <View style={{ width: 40 }} />}
      <Text style={[FONT, { fontSize: 11, color: colors.muted }]}>{title}</Text>
      {right ?? <View style={{ width: 40 }} />}
    </View>
  );
}

/** .round — круглая иконка-кнопка 40px */
export function Round({ icon: Icon, notice, ...rest }: PressableProps & { icon: LucideIcon; notice?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable {...rest} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={16} color={colors.text} strokeWidth={1.6} />
      {notice && <View style={{ position: 'absolute', right: 5, top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange, borderWidth: 2, borderColor: colors.surface }} />}
    </Pressable>
  );
}

/** .page-title */
export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 16 }}>
      <View>
        <Text style={[FONT, { fontSize: 28, lineHeight: 30, fontWeight: '500', letterSpacing: -1.4, color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[FONT, { fontSize: 11, color: colors.muted, marginTop: 4 }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** .section-head — h2 + ссылка/тег справа */
export function SectionHead({ title, action, onAction, tag }: { title: string; action?: string; onAction?: () => void; tag?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 19, marginBottom: 10, marginHorizontal: 2 }}>
      <Text style={[FONT, { fontSize: 17, fontWeight: '500', letterSpacing: -0.4, color: colors.text }]}>{title}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={[FONT, { fontSize: 11, color: colors.green }]}>{action}</Text></Pressable> : tag ? <EventTag>{tag}</EventTag> : null}
    </View>
  );
}

/* ── типографика ── */

export function T({ size = 11, muted, weight, color, style, ...rest }: TextProps & { size?: number; muted?: boolean; weight?: '400' | '500'; color?: string }) {
  const { colors } = useTheme();
  return <Text {...rest} style={[FONT, { fontSize: size, color: color ?? (muted ? colors.muted : colors.text), fontWeight: weight }, style]} />;
}

/** .event-tag — маленький лаймовый ярлык */
export function EventTag({ children, plain }: PropsWithChildren<{ plain?: boolean }>) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: plain ? colors.surface2 : colors.lime, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 4 }}>
      <Text style={[FONT, { fontSize: 8, color: plain ? colors.text : colors.onLime }]}>{children}</Text>
    </View>
  );
}

/** .filter-row + .filter-pill */
export function FilterRow<T extends string | undefined>({ items, value, onChange }: { items: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable key={String(it.value)} onPress={() => onChange(it.value)} style={{ borderWidth: 1, borderColor: active ? colors.text : colors.line, backgroundColor: active ? colors.text : colors.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }}>
            <Text style={[FONT, { fontSize: 10, color: active ? colors.bg : colors.text }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** .chip — внутри тёмной hero-карточки */
export function Chip({ label, active }: { label: string; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 999, backgroundColor: active ? colors.lime : whiteAlpha(10), paddingHorizontal: 10, paddingVertical: 7 }}>
      <Text style={[FONT, { fontSize: 11, color: active ? colors.onLime : whiteAlpha(70) }]}>{label}</Text>
    </View>
  );
}

/* ── карточки ── */

/** .rank-card / .event-hero / .live-hero / .rating-hero — тёмно-зелёная карточка с дугами */
export function DeepCard({ children, style, minHeight }: PropsWithChildren<{ style?: ViewStyle; minHeight?: number }>) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.deep, borderRadius: 24, padding: 18, overflow: 'hidden', minHeight }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -95, top: 35, width: 280, height: 110, borderRadius: 140, borderWidth: 1, borderColor: whiteAlpha(17), transform: [{ rotate: '-22deg' }] }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -135, top: 65, width: 330, height: 165, borderRadius: 165, borderWidth: 1, borderColor: whiteAlpha(17), transform: [{ rotate: '-22deg' }] }} />
      {children}
    </View>
  );
}

/** .track + .fill */
export function Track({ pct }: { pct: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 5, backgroundColor: whiteAlpha(13), borderRadius: 99, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: colors.lime, borderRadius: 99 }} />
    </View>
  );
}

/** .surface — светлая карточка с рамкой (event-card, rule-block, podium-place …) */
export function Surface({ children, style, radius = 20, deep, ...rest }: ViewProps & { radius?: number; deep?: boolean }) {
  const { colors } = useTheme();
  return (
    <View {...rest} style={[{ backgroundColor: deep ? colors.deep : colors.surface, borderWidth: 1, borderColor: deep ? 'transparent' : colors.line, borderRadius: radius, padding: 14 }, style]}>
      {children}
    </View>
  );
}

/** .date — чёрный квадратик с числом */
export function DateBadge({ date, inverted }: { date: Date; inverted?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: 50, backgroundColor: inverted ? colors.lime : colors.text, borderRadius: 13, paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center' }}>
      <Text style={[FONT, { fontSize: 21, lineHeight: 22, fontWeight: '500', color: inverted ? colors.onLime : colors.bg }]}>{date.getDate()}</Text>
      <Text style={[FONT, { fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase', color: inverted ? colors.onLime : colors.bg }]}>{date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')}</Text>
    </View>
  );
}

/** .status — зелёная точка + текст */
export function Status({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green }} />
      <Text style={[FONT, { fontSize: 9, color: colors.green }]}>{children}</Text>
    </View>
  );
}

/** .stats + .stat */
export function Stats({ items }: { items: Array<{ label: string; value: string }> }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 18 }}>
      {items.map((s) => (
        <View key={s.label} style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingVertical: 11, paddingHorizontal: 9 }}>
          <Text style={[FONT, { fontSize: 9, color: colors.muted, marginBottom: 4 }]}>{s.label}</Text>
          <Text style={[FONT, { fontSize: 12, fontWeight: '500', color: colors.text }]}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** .info-list + .info-row */
export function InfoList({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <View style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.line, borderRadius: 18, overflow: 'hidden', gap: StyleSheet.hairlineWidth }}>{children}</View>;
}
export function InfoRow({ icon: Icon, label, value, action, onAction, onPress, trailing }: { icon: LucideIcon; label: string; value: string; action?: string; onAction?: () => void; onPress?: () => void; trailing?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ backgroundColor: colors.surface, flexDirection: 'row', gap: 11, alignItems: 'flex-start', padding: 12 }}>
      <Icon size={16} color={colors.green} strokeWidth={1.6} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[FONT, { fontSize: 9, color: colors.muted, marginBottom: 3 }]}>{label}</Text>
        <Text style={[FONT, { fontSize: 11, fontWeight: '500', color: colors.text, lineHeight: 15 }]}>{value}</Text>
      </View>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={[FONT, { fontSize: 9, color: colors.green }]}>{action}</Text></Pressable> : trailing}
    </Pressable>
  );
}

/** .detail-section */
export function DetailSection({ title, children, text }: PropsWithChildren<{ title: string; text?: string }>) {
  const { colors } = useTheme();
  return (
    <View style={{ marginVertical: 10, marginHorizontal: 2 }}>
      <Text style={[FONT, { fontSize: 17, fontWeight: '500', letterSpacing: -0.4, color: colors.text, marginBottom: 10 }]}>{title}</Text>
      {text ? <Text style={[FONT, { fontSize: 11, lineHeight: 17, color: colors.muted }]}>{text}</Text> : null}
      {children}
    </View>
  );
}

/** .rule-block — разрешено / запрещено */
export function RuleBlock({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  const { colors } = useTheme();
  return (
    <Surface radius={18} style={{ padding: 13, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon size={14} color={colors.green} strokeWidth={1.6} />
        <Text style={[FONT, { fontSize: 12, fontWeight: '500', color: colors.text }]}>{title}</Text>
      </View>
      {items.map((it) => (
        <Text key={it} style={[FONT, { fontSize: 10, lineHeight: 15, color: colors.muted, paddingLeft: 10 }]}>• {it}</Text>
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
        <View key={t.time + t.title} style={{ flex: 1, borderTopWidth: 2, borderTopColor: colors.green, paddingTop: 8 }}>
          <Text style={[FONT, { fontSize: 12, fontWeight: '500', color: colors.text }]}>{t.time}</Text>
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
    <View style={{ flexDirection: 'row', gap: 5, marginTop: 10, marginBottom: 15 }}>
      {steps.map((s, i) => {
        const active = i <= activeUntil;
        return (
          <View key={s.label} style={{ flex: 1, borderWidth: 1, borderColor: active ? colors.green : colors.line, backgroundColor: active ? `${colors.green}17` : colors.surface, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center' }}>
            <Text style={[FONT, { fontSize: 10, fontWeight: '500', color: colors.text }]}>{s.label}</Text>
            <Text style={[FONT, { fontSize: 9, color: colors.muted }]}>{s.sub}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** .avatar — инициалы в кружке */
export function Avatar({ name, size = 34, lime, radius }: { name: string; size?: number; lime?: boolean; radius?: number }) {
  const { colors } = useTheme();
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size / 2, backgroundColor: lime ? colors.lime : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[FONT, { fontSize: size * 0.27, fontWeight: '500', color: lime ? colors.onLime : colors.text }]}>{initials || '—'}</Text>
    </View>
  );
}

/** Кнопка в стиле .submit-result (тёмная) / .live-actions button (светлая) */
export function ActionButton({ title, icon: Icon, primary, style, ...rest }: PressableProps & { title: string; icon?: LucideIcon; primary?: boolean; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <Pressable {...rest} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: primary ? colors.text : colors.line, backgroundColor: primary ? colors.text : colors.surface, borderRadius: 12, padding: 11, opacity: pressed ? 0.8 : rest.disabled ? 0.5 : 1 }, style]}>
      {Icon && <Icon size={13} color={primary ? colors.bg : colors.text} strokeWidth={1.6} />}
      <Text style={[FONT, { fontSize: 9, color: primary ? colors.bg : colors.text }]}>{title}</Text>
    </Pressable>
  );
}

/** Лаймовая CTA-кнопка (.open-cta в sheet регистрации) */
export function LimeButton({ title, style, ...rest }: PressableProps & { title: string; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <Pressable {...rest} style={({ pressed }) => [{ backgroundColor: colors.lime, borderRadius: 999, paddingVertical: 13, alignItems: 'center', opacity: pressed ? 0.85 : rest.disabled ? 0.5 : 1 }, style]}>
      <Text style={[FONT, { fontSize: 12, fontWeight: '500', color: colors.onLime }]}>{title}</Text>
    </Pressable>
  );
}

export const fontFamily = FONT;
