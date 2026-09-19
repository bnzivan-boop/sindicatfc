import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../../src/api/client';
import { useMe } from '../../src/auth/useAuth';
import { Field } from '../../src/components/Field';
import { Picker } from '../../src/components/Picker';
import { go, WizardFrame } from '../../src/features/onboarding/WizardFrame';
import { useOnboarding } from '../../src/features/onboarding/store';

interface City { id: string; name: string }

/** Шаг 1: имя, город, стаж (концепция «Основная информация»). */
export default function AboutStep() {
  const { draft, patch } = useOnboarding();
  const me = useMe();
  const qc = useQueryClient();
  const cities = useQuery({ queryKey: ['cities'], queryFn: () => api<City[]>('/cities', { auth: false }) });
  useEffect(() => {
    const p = me.data?.profile;
    if (p && !draft.displayName) patch({ displayName: p.displayName, cityId: p.cityId ?? undefined, experienceYears: p.experienceYears ?? undefined });
  }, [me.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => api('/me/profile', { method: 'PATCH', body: { displayName: draft.displayName.trim(), cityId: draft.cityId ?? null, experienceYears: draft.experienceYears ?? null } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['me'] }); go('disciplines'); },
  });

  return (
    <WizardFrame step="about" title="о вас" subtitle="как вас показывать в рейтинге и протоколах" nextDisabled={draft.displayName.trim().length < 2} busy={save.isPending} error={save.isError ? String(save.error) : null} onNext={() => save.mutate()}>
      <Field label="имя и фамилия" value={draft.displayName} onChangeText={(displayName) => patch({ displayName })} placeholder="Алексей Смирнов" autoFocus />
      <Picker label="город" items={(cities.data ?? []).map((c) => ({ value: c.id, label: c.name }))} value={draft.cityId} onChange={(cityId) => patch({ cityId })} />
      <Field label="рыболовный стаж, лет" value={draft.experienceYears?.toString() ?? ''} onChangeText={(v) => patch({ experienceYears: v ? Number(v) : undefined })} keyboardType="number-pad" placeholder="12" />
    </WizardFrame>
  );
}
