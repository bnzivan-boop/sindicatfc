import { goBack } from '../../src/navigation';
import { LocationPrivacy, type CreateCatch } from '@sindikat/domain';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Field } from '../../src/components/Field';
import { Picker } from '../../src/components/Picker';
import { DetailTopBar, LimeButton, Page, PageTitle, Round, SectionHead, T } from '../../src/components/ui';
import { useCreateCatch, usePromoteTrophy, useSpecies } from '../../src/features/catches/useCatches';
import { PhotoPicker } from '../../src/features/media/PhotoPicker';
import { uploadTo, type PickedImage } from '../../src/features/media/upload';
import { useGearKits } from '../../src/features/gear/useGear';
import { useTheme } from '../../src/theme/useTheme';

const PRIV: Record<LocationPrivacy, string> = { HIDDEN: 'скрыть место', WATERBODY_ONLY: 'только водоём', EXACT: 'точная точка' };
const num = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : undefined);

/** Новая запись дневника (концепция «Трофеи»): фото · вид · длина · вес · описание · снасть · геолокация с приватностью. */
export default function NewCatchScreen() {
  const { colors } = useTheme();
  const species = useSpecies();
  const kits = useGearKits();
  const create = useCreateCatch();
  const promote = usePromoteTrophy();
  const [speciesId, setSpeciesId] = useState<string>();
  const [lengthCm, setLengthCm] = useState('');
  const [weightG, setWeightG] = useState('');
  const [description, setDescription] = useState('');
  const [gearKitId, setGearKitId] = useState<string>();
  const [lure, setLure] = useState('');
  const [privacy, setPrivacy] = useState<LocationPrivacy>('HIDDEN');
  const [asTrophy, setAsTrophy] = useState(false);
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = () => {
    const dto: CreateCatch = {
      speciesId: speciesId!,
      lengthMm: num(lengthCm) ? Math.round(num(lengthCm)! * 10) : undefined,
      weightG: num(weightG) ? Math.round(num(weightG)!) : undefined,
      description: description || undefined,
      caughtAt: new Date().toISOString(),
      gear: gearKitId || lure ? { gearKitId, freeText: lure || undefined } : undefined,
      location: { privacy },
      visibility: 'PUBLIC',
    };
    create.mutate(dto, {
      onSuccess: async (c) => {
        if (photo) {
          setUploading(true);
          await uploadTo(`/me/catches/${c.id}/media/upload-url`, photo).catch(() => undefined);
          setUploading(false);
        }
        if (asTrophy) promote.mutate(c.id, { onSettled: () => goBack('/diary') });
        else goBack('/diary');
      },
    });
  };

  return (
    <Page>
      <DetailTopBar title="новый улов" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} />
      <PageTitle title="улов" subtitle="запись дневника; трофеем можно сделать позже" />
      <View style={{ gap: 12 }}>
        <PhotoPicker value={photo} onChange={setPhoto} hint="фото улова — необязательно, но для трофея желательно" />
        <Picker label="вид рыбы" items={(species.data ?? []).map((s) => ({ value: s.id, label: s.nameRu.toLowerCase() }))} value={speciesId} onChange={setSpeciesId} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Field label="длина, см" value={lengthCm} onChangeText={setLengthCm} keyboardType="decimal-pad" placeholder="31" /></View>
          <View style={{ flex: 1 }}><Field label="вес, г" value={weightG} onChangeText={setWeightG} keyboardType="number-pad" placeholder="420" /></View>
        </View>
        <Field label="описание" value={description} onChangeText={setDescription} multiline placeholder="вечер, бровка на течении, поклёвка на паузе" style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <SectionHead title="на что поймана" />
        <Picker label="комплект из арсенала" items={[{ value: '', label: 'не указывать' }, ...(kits.data ?? []).map((k) => ({ value: k.id, label: k.name }))]} value={gearKitId ?? ''} onChange={(v) => setGearKitId(v || undefined)} />
        <Field label="приманка / монтаж / наживка" value={lure} onChangeText={setLure} placeholder="виброхвост 2 дюйма на джиг-головке 3 г" />
        <SectionHead title="геолокация" />
        <Picker items={Object.values(LocationPrivacy).map((v) => ({ value: v, label: PRIV[v] }))} value={privacy} onChange={setPrivacy} />
        <T size={9} muted>Точная координата никогда не публикуется без вашего согласия. Определение точки по GPS — этап 4.</T>
        <Picker label="сразу в трофеи" items={[{ value: 'no', label: 'нет, просто запись' }, { value: 'yes', label: 'да, это трофей' }]} value={asTrophy ? 'yes' : 'no'} onChange={(v) => setAsTrophy(v === 'yes')} />
        {create.isError && <T size={10} color={colors.orange}>{String(create.error)}</T>}
        <LimeButton title={uploading ? 'загружаем фото…' : create.isPending ? 'сохраняем…' : 'сохранить улов'} disabled={!speciesId || create.isPending || uploading} onPress={submit} />
      </View>
    </Page>
  );
}
