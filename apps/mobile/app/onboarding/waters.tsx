import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WATER_TYPE_LABELS_RU, WaterType } from '@sindikat/domain';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import { fontFamily, T } from '../../src/components/ui';
import { go, WizardFrame } from '../../src/features/onboarding/WizardFrame';
import { useOnboarding } from '../../src/features/onboarding/store';
import { useTheme } from '../../src/theme/useTheme';

/** Шаг 3: домашние акватории. Конкретные водоёмы (PostGIS) — позже через карту. */
export default function WatersStep() {
  const { colors } = useTheme();
  const { draft, patch } = useOnboarding();
  const qc = useQueryClient();
  const toggle = (w: WaterType) => patch({ waterTypes: draft.waterTypes.includes(w) ? draft.waterTypes.filter((x) => x !== w) : [...draft.waterTypes, w] });
  const save = useMutation({
    mutationFn: () => api('/me/profile', { method: 'PATCH', body: { waterTypes: draft.waterTypes } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['me'] }); go('gear'); },
  });
  return (
    <WizardFrame step="waters" title="где ловите" subtitle="домашние водоёмы или типы акваторий" busy={save.isPending} error={save.isError ? String(save.error) : null} onNext={() => save.mutate()} onSkip={() => go('gear')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {Object.values(WaterType).map((w) => {
          const active = draft.waterTypes.includes(w);
          return (
            <Pressable key={w} onPress={() => toggle(w)} style={{ borderWidth: 1, borderColor: active ? colors.text : colors.line, backgroundColor: active ? colors.text : colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={[fontFamily, { fontSize: 11, color: active ? colors.bg : colors.text }]}>{WATER_TYPE_LABELS_RU[w]}</Text>
            </Pressable>
          );
        })}
      </View>
      <T size={9} muted>Точку конкретного водоёма можно будет отметить на карте — она не публикуется без вашего согласия.</T>
    </WizardFrame>
  );
}
