import { Pressable, ScrollView, Text, View } from 'react-native';
import { fontFamily } from './ui';
import { useTheme } from '../theme/useTheme';

/** Горизонтальный выбор одного значения (.filter-pill), с подписью. */
export function Picker<T extends string>({ label, items, value, onChange }: { label?: string; items: Array<{ value: T; label: string }>; value: T | undefined; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 5 }}>
      {label ? <Text style={[fontFamily, { fontSize: 9, color: colors.muted }]}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {items.map((it) => {
          const active = it.value === value;
          return (
            <Pressable key={it.value} onPress={() => onChange(it.value)} style={{ borderWidth: 1, borderColor: active ? colors.text : colors.line, backgroundColor: active ? colors.text : colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={[fontFamily, { fontSize: 11, color: active ? colors.bg : colors.text }]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Переключатель да/нет в том же стиле. */
export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <Picker label={label} items={[{ value: 'yes', label: 'да' }, { value: 'no', label: 'нет' }]} value={value ? 'yes' : 'no'} onChange={(v) => onChange(v === 'yes')} />;
}
