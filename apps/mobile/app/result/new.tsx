import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTournament } from '../../src/api/tournaments';
import { Field } from '../../src/components/Field';
import { Picker } from '../../src/components/Picker';
import { DetailTopBar, LimeButton, Page, PageTitle, Round, SectionHead, Surface, T } from '../../src/components/ui';
import { useSpecies } from '../../src/features/catches/useCatches';
import { PhotoPicker } from '../../src/features/media/PhotoPicker';
import type { PickedImage } from '../../src/features/media/upload';
import { useSubmitResult, type UploadState } from '../../src/features/results/useResults';
import { goBack } from '../../src/navigation';
import { useTheme } from '../../src/theme/useTheme';

const STATE_LABEL: Record<UploadState, string> = { ON_DEVICE: 'на устройстве', CREATING: 'создаём черновик…', UPLOADING: 'загружается…', SUBMITTING: 'отправляем…', SENT: 'отправлено · ждёт судью', QUEUED: 'нет связи · отправим автоматически', ERROR: 'ошибка' };

/** «Добавить рыбу» (прототип result-sheet): фото на линейке с маркером → вид → длина → отправка. */
export default function NewResultScreen() {
  const { colors } = useTheme();
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const { data: t } = useTournament(tournamentId);
  const species = useSpecies();
  const submit = useSubmitResult(tournamentId);
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [speciesId, setSpeciesId] = useState<string>();
  const [lengthCm, setLengthCm] = useState('');
  const [weightG, setWeightG] = useState('');
  const [marker, setMarker] = useState('');
  const byWeight = t?.scoringMode === 'TOTAL_WEIGHT';
  const ready = !!photo && !!speciesId && marker.trim().length >= 2 && (byWeight ? !!weightG : !!lengthCm) && submit.state !== 'SENT' && submit.state !== 'QUEUED';

  const send = () => submit.mutate(
    {
      draft: { speciesId: speciesId!, lengthMm: lengthCm ? Math.round(Number(lengthCm.replace(',', '.')) * 10) : undefined, weightG: weightG ? Math.round(Number(weightG)) : undefined, markerCode: marker.trim(), capturedAt: new Date().toISOString() },
      photo: photo!,
    },
    { onSuccess: () => setTimeout(() => goBack({ pathname: '/live/[id]', params: { id: tournamentId } }), 900) },
  );

  return (
    <Page>
      <DetailTopBar title="добавить рыбу" left={<Round icon={ArrowLeft} onPress={() => goBack({ pathname: '/live/[id]', params: { id: tournamentId } })} />} />
      <PageTitle title="фиксация" subtitle={t?.title ?? '…'} />
      <View style={{ gap: 12 }}>
        <PhotoPicker value={photo} onChange={setPhoto} hint="рыба на официальной линейке, номер участника и маркер турнира в кадре; после фото — немедленный выпуск" />
        <Picker label="вид рыбы" items={(species.data ?? []).map((s) => ({ value: s.id, label: s.nameRu.toLowerCase() }))} value={speciesId} onChange={setSpeciesId} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Field label="длина, см" value={lengthCm} onChangeText={setLengthCm} keyboardType="decimal-pad" placeholder="31" /></View>
          {byWeight && <View style={{ flex: 1 }}><Field label="вес, г" value={weightG} onChangeText={setWeightG} keyboardType="number-pad" placeholder="420" /></View>}
          <View style={{ flex: 1 }}><Field label="код маркера" value={marker} onChangeText={setMarker} autoCapitalize="characters" placeholder="USO-17" /></View>
        </View>
        <SectionHead title="статус отправки" />
        <Surface radius={14} style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T size={11} weight="500" color={submit.state === 'ERROR' ? colors.orange : submit.state === 'SENT' ? colors.green : submit.state === 'QUEUED' ? colors.orange : colors.text}>{STATE_LABEL[submit.state]}</T>
          <T size={9} muted>{photo ? 'фото готово' : 'нет фото'}</T>
        </Surface>
        {submit.isError && <T size={10} color={colors.orange}>{String(submit.error)}</T>}
        <LimeButton title={submit.isPending ? STATE_LABEL[submit.state] : 'отправить судье'} disabled={!ready || submit.isPending} onPress={send} />
        <T size={9} muted>Результат сохраняется на устройстве и отправляется, как только появится связь. Судья видит только полностью загруженные результаты; дедлайн — по серверному времени.</T>
      </View>
    </Page>
  );
}
