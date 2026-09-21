import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../src/api/client';
import { useMe } from '../../src/auth/useAuth';
import { Field } from '../../src/components/Field';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { fontFamily } from '../../src/components/ui';
import { useTheme } from '../../src/theme/useTheme';
import { go, WizardFrame } from '../../src/features/onboarding/WizardFrame';
import { useOnboarding } from '../../src/features/onboarding/store';

interface City { id: string; name: string }

/** Шаг 1: имя, город, стаж (концепция «Основная информация»). */
export default function AboutStep() {
  const { colors } = useTheme();
  const { draft, patch } = useOnboarding();
  const [cityText, setCityText] = useState('');
  const me = useMe();
  const qc = useQueryClient();
  const cities = useQuery({ queryKey: ['cities'], queryFn: () => api<City[]>('/cities', { auth: false }) });
  useEffect(() => {
    const p = me.data?.profile;
    if (p && !draft.displayName) { patch({ displayName: p.displayName, cityId: p.cityId ?? undefined, experienceYears: p.experienceYears ?? undefined }); setCityText(p.city?.name ?? ''); }
  }, [me.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => api('/me/profile', { method: 'PATCH', body: { displayName: draft.displayName.trim(), cityName: cityText.trim() || null, experienceYears: draft.experienceYears ?? null } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['me'] }); go('disciplines'); },
  });

  return (
    <WizardFrame step="about" title="о вас" subtitle="как вас показывать в рейтинге и протоколах" nextDisabled={draft.displayName.trim().length < 2} busy={save.isPending} error={save.isError ? String(save.error) : null} onNext={() => save.mutate()}>
      <Field label="имя и фамилия" value={draft.displayName} onChangeText={(displayName) => patch({ displayName })} placeholder="Алексей Смирнов" autoFocus />
      <View style={{ gap: 6 }}>
        <Field label="город" value={cityText} onChangeText={setCityText} placeholder="Москва" autoCapitalize="words" />
        {cityText.trim().length >= 1 && (cities.data ?? []).some((c) => c.name.toLowerCase().startsWith(cityText.trim().toLowerCase()) && c.name.toLowerCase() !== cityText.trim().toLowerCase()) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {(cities.data ?? []).filter((c) => c.name.toLowerCase().startsWith(cityText.trim().toLowerCase())).slice(0, 6).map((c) => (
              <Pressable key={c.id} onPress={() => setCityText(c.name)} style={{ backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}><Text style={[fontFamily, { fontSize: 11, color: colors.text }]}>{c.name}</Text></Pressable>
            ))}
          </ScrollView>
        )}
      </View>
      <Field label="рыболовный стаж, лет" value={draft.experienceYears?.toString() ?? ''} onChangeText={(v) => patch({ experienceYears: v ? Number(v) : undefined })} keyboardType="number-pad" placeholder="12" />
    </WizardFrame>
  );
}
