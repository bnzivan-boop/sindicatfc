import { Field } from '../../src/components/Field';
import { Toggle } from '../../src/components/Picker';
import { T } from '../../src/components/ui';
import { useSaveBoat } from '../../src/features/gear/useGear';
import { go, WizardFrame } from '../../src/features/onboarding/WizardFrame';
import { useOnboarding } from '../../src/features/onboarding/store';

/** Шаг 5: лодка — есть/нет; карточка со всеми полями в профиле. */
export default function BoatStep() {
  const { draft, patch } = useOnboarding();
  const save = useSaveBoat();
  const submit = () => {
    if (!draft.hasBoat) return go('done');
    const [brand, ...rest] = (draft.boatText ?? '').trim().split(/\s+/);
    save.mutate({ type: 'PVC', customBrand: brand || undefined, customModel: rest.join(' ') || undefined, availableForTeamTrips: false, visibility: 'PUBLIC' }, { onSuccess: () => go('done') });
  };
  return (
    <WizardFrame step="boat" title="лодка" subtitle="для лодочных турниров и совместных выездов" busy={save.isPending} error={save.isError ? String(save.error) : null} onNext={submit} onSkip={() => go('done')}>
      <Toggle label="есть лодка" value={!!draft.hasBoat} onChange={(hasBoat) => patch({ hasBoat })} />
      {draft.hasBoat && <Field label="бренд и модель" value={draft.boatText ?? ''} onChangeText={(boatText) => patch({ boatText })} placeholder="Gladiator E330" autoFocus />}
      <T size={9} muted>Регистрационный номер и документы не публикуются: их увидит только организатор конкретного лодочного турнира.</T>
    </WizardFrame>
  );
}
