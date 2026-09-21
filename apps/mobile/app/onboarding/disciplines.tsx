import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DISCIPLINE_LABELS_RU, Discipline } from '@sindikat/domain';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import { fontFamily, SectionHead, T } from '../../src/components/ui';
import { useSpecies } from '../../src/features/catches/useCatches';
import { go, WizardFrame } from '../../src/features/onboarding/WizardFrame';
import { useOnboarding } from '../../src/features/onboarding/store';
import { useTheme } from '../../src/theme/useTheme';

/** Шаг 2: дисциплины по приоритету + предпочитаемые виды рыбы. */
export default function DisciplinesStep() {
  const { colors } = useTheme();
  const { draft, patch } = useOnboarding();
  const qc = useQueryClient();
  const species = useSpecies();

  const toggleD = (d: Discipline) => patch({ disciplines: draft.disciplines.includes(d) ? draft.disciplines.filter((x) => x !== d) : [...draft.disciplines, d] });
  const toggleS = (id: string) => patch({ targetSpeciesIds: draft.targetSpeciesIds.includes(id) ? draft.targetSpeciesIds.filter((x) => x !== id) : [...draft.targetSpeciesIds, id] });

  const save = useMutation({
    mutationFn: async () => {
      await api('/me/disciplines', { method: 'PUT', body: { disciplines: draft.disciplines.map((discipline, i) => ({ discipline, priority: i + 1 })) } });
      await api('/me/profile', { method: 'PATCH', body: { targetSpeciesIds: draft.targetSpeciesIds } });
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['me'] }); go('waters'); },
  });

  const chip = (active: boolean, label: string, onPress: () => void, key: string) => (
    <Pressable key={key} onPress={onPress} style={{ borderWidth: 1, borderColor: active ? colors.text : colors.line, backgroundColor: active ? colors.text : colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={[fontFamily, { fontSize: 11, color: active ? colors.bg : colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <WizardFrame step="disciplines" title="чем ловите" subtitle="дисциплины — в порядке приоритета, первая станет основной" nextDisabled={draft.disciplines.length === 0} busy={save.isPending} error={save.isError ? String(save.error) : null} onNext={() => save.mutate()}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {Object.values(Discipline).map((d) => { const i = draft.disciplines.indexOf(d); return chip(i >= 0, `${i >= 0 ? `${i + 1} · ` : ''}${DISCIPLINE_LABELS_RU[d].toLowerCase()}`, () => toggleD(d), d); })}
      </View>
      <SectionHead title="целевая рыба" tag="необязательно" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(species.data ?? []).map((s) => chip(draft.targetSpeciesIds.includes(s.id), s.nameRu.toLowerCase(), () => toggleS(s.id), s.id))}
      </View>
      <T size={9} muted>Публичный профиль покажет дисциплины и целевую рыбу; по ним же подбираются турниры и компания.</T>
    </WizardFrame>
  );
}
