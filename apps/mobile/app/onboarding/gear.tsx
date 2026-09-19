import { View } from 'react-native';
import { Field } from '../../src/components/Field';
import { Picker } from '../../src/components/Picker';
import { DISCIPLINE_LABELS_RU } from '@sindikat/domain';
import { Surface, T } from '../../src/components/ui';
import { useSaveKit } from '../../src/features/gear/useGear';
import { go, WizardFrame } from '../../src/features/onboarding/WizardFrame';
import { useOnboarding } from '../../src/features/onboarding/store';

/**
 * Шаг 4: первый комплект — короткая форма (удилище, катушка, шнур одной строкой каждое).
 * Полный редактор со всеми полями — в профиле; здесь важно не потерять пользователя.
 */
export default function GearStep() {
  const { draft, patch } = useOnboarding();
  const kit = draft.kit ?? {};
  const save = useSaveKit();
  const discipline = kit.discipline ?? draft.disciplines[0] ?? 'STREET';

  const parse = (text: string | undefined) => {
    const [brand, ...rest] = (text ?? '').trim().split(/\s+/);
    return brand ? { customBrand: brand, customModel: rest.join(' ') || undefined } : {};
  };
  const submit = () =>
    save.mutate(
      {
        name: kit.name?.trim() || `Основной ${DISCIPLINE_LABELS_RU[discipline].toLowerCase()}`,
        discipline, isPrimary: true, visibility: 'PUBLIC', targetSpeciesIds: draft.targetSpeciesIds, lures: [],
        rod: kit.rodText ? { type: 'SPINNING', ...parse(kit.rodText) } : undefined,
        reel: kit.reelText ? { type: 'SPINNING', ...parse(kit.reelText) } : undefined,
        mainLine: kit.lineText ? { type: 'BRAID', ...parse(kit.lineText) } : undefined,
      },
      { onSuccess: () => go('boat') },
    );

  return (
    <WizardFrame step="gear" title="первый комплект" subtitle="удилище → катушка → шнур · подробности добавите в профиле" nextLabel="сохранить комплект" nextDisabled={!kit.rodText?.trim()} busy={save.isPending} error={save.isError ? String(save.error) : null} onNext={submit} onSkip={() => go('boat')}>
      <Field label="название" value={kit.name ?? ''} onChangeText={(name) => patch({ kit: { ...kit, name } })} placeholder={`Основной ${DISCIPLINE_LABELS_RU[discipline].toLowerCase()}`} />
      <Picker label="дисциплина" items={draft.disciplines.length ? draft.disciplines.map((d) => ({ value: d, label: DISCIPLINE_LABELS_RU[d].toLowerCase() })) : [{ value: 'STREET' as const, label: 'стрит' }]} value={discipline} onChange={(d) => patch({ kit: { ...kit, discipline: d } })} />
      <Field label="удилище · бренд и модель" value={kit.rodText ?? ''} onChangeText={(rodText) => patch({ kit: { ...kit, rodText } })} placeholder="Graphiteleader Corto 0,6–8 г" />
      <Field label="катушка" value={kit.reelText ?? ''} onChangeText={(reelText) => patch({ kit: { ...kit, reelText } })} placeholder="Shimano Vanquish C2000S" />
      <Field label="основной шнур / леска" value={kit.lineText ?? ''} onChangeText={(lineText) => patch({ kit: { ...kit, lineText } })} placeholder="YGK X-Braid PE #0.4" />
      <Surface radius={14} style={{ padding: 12 }}><View><T size={10} muted>Не нашли модель в каталоге — просто напишите как есть: администратор добавит её в справочник, комплект от этого не пострадает.</T></View></Surface>
    </WizardFrame>
  );
}
