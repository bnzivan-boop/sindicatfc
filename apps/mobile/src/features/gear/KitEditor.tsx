import { goBack } from '../../navigation';
import { DISCIPLINE_LABELS_RU, Discipline, LineType, ReelType, RodType, Visibility, type UpsertGearKit } from '@sindikat/domain';
import { router } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Field } from '../../components/Field';
import { Picker, Toggle } from '../../components/Picker';
import { DetailTopBar, LimeButton, Page, PageTitle, Round, SectionHead, T } from '../../components/ui';
import { useTheme } from '../../theme/useTheme';
import { useDeleteKit, useGearKit, useSaveKit } from './useGear';

const ROD: Record<RodType, string> = { SPINNING: 'спиннинг', FEEDER: 'фидер', FLOAT: 'поплавок', ICE: 'зимнее', CASTING: 'кастинг', OTHER: 'другое' };
const REEL: Record<ReelType, string> = { SPINNING: 'безынерционная', BAITCASTING: 'мультипликатор', ICE: 'зимняя', OTHER: 'другая' };
const LINE: Record<LineType, string> = { BRAID: 'плетёнка', MONO: 'монофил', FLUOROCARBON: 'флюорокарбон' };
const VIS: Record<Visibility, string> = { PUBLIC: 'всем', FRIENDS: 'друзьям', PRIVATE: 'только мне' };

const num = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : undefined);
const half = { flex: 1 } as const;
const row = { flexDirection: 'row' as const, gap: 12 };

/**
 * Редактор комплекта: удилище → катушка → основная леска → поводок → приманки (концепция «Арсенал»).
 * Бренд/модель — свободный текст; неизвестные модели уходят в очередь нормализации каталога (gear_custom_requests).
 */
export function KitEditor({ id }: { id?: string }) {
  const { colors } = useTheme();
  const existing = useGearKit(id);
  const save = useSaveKit(id);
  const del = useDeleteKit();

  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('STREET');
  const [isPrimary, setIsPrimary] = useState(true);
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [comment, setComment] = useState('');
  const [rod, setRod] = useState({ type: 'SPINNING' as RodType, brand: '', model: '', lengthCm: '', testMin: '', testMax: '' });
  const [reel, setReel] = useState({ type: 'SPINNING' as ReelType, brand: '', model: '', size: '', ratio: '', weight: '' });
  const [line, setLine] = useState({ type: 'BRAID' as LineType, brand: '', pe: '', diameter: '', load: '', color: '' });
  const [leader, setLeader] = useState({ material: 'FLUOROCARBON' as LineType, brand: '', diameter: '', length: '' });
  const [lures, setLures] = useState('');

  useEffect(() => {
    const k = existing.data;
    if (!k) return;
    setName(k.name); setDiscipline(k.discipline); setIsPrimary(k.isPrimary); setVisibility(k.visibility); setComment(k.comment ?? '');
    if (k.rod) setRod({ type: k.rod.type, brand: k.rod.customBrand ?? '', model: k.rod.customModel ?? '', lengthCm: k.rod.lengthMm ? String(k.rod.lengthMm / 10) : '', testMin: k.rod.lureTestMinG?.toString() ?? '', testMax: k.rod.lureTestMaxG?.toString() ?? '' });
    if (k.reel) setReel({ type: k.reel.type, brand: k.reel.customBrand ?? '', model: k.reel.customModel ?? '', size: k.reel.size ?? '', ratio: k.reel.gearRatio ?? '', weight: k.reel.weightG?.toString() ?? '' });
    if (k.mainLine) setLine({ type: k.mainLine.type, brand: [k.mainLine.customBrand, k.mainLine.customModel].filter(Boolean).join(' '), pe: k.mainLine.peSize ?? '', diameter: k.mainLine.diameterMm?.toString() ?? '', load: k.mainLine.breakingLoadLb?.toString() ?? '', color: k.mainLine.color ?? '' });
    if (k.leader) setLeader({ material: k.leader.material, brand: k.leader.customBrand ?? '', diameter: k.leader.diameterMm?.toString() ?? '', length: k.leader.lengthCm?.toString() ?? '' });
    setLures((k.lures ?? []).map((l) => [l.type, l.weightG ? `${l.weightG} г` : ''].filter(Boolean).join(' ')).join('\n'));
  }, [existing.data]);

  const submit = () => {
    const parsedLures = lures.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.match(/(\d+(?:[.,]\d+)?)\s*г/);
      return { type: l.replace(/(\d+(?:[.,]\d+)?)\s*г/, '').trim() || l, weightG: m ? Number(m[1]!.replace(',', '.')) : undefined };
    });
    const dto: UpsertGearKit = {
      name, discipline, isPrimary, visibility, comment: comment || undefined, targetSpeciesIds: [], lures: parsedLures,
      rod: { type: rod.type, customBrand: rod.brand || undefined, customModel: rod.model || undefined, lengthMm: num(rod.lengthCm) ? Math.round(num(rod.lengthCm)! * 10) : undefined, lureTestMinG: num(rod.testMin), lureTestMaxG: num(rod.testMax) },
      reel: { type: reel.type, customBrand: reel.brand || undefined, customModel: reel.model || undefined, size: reel.size || undefined, gearRatio: reel.ratio || undefined, weightG: num(reel.weight) },
      mainLine: { type: line.type, customBrand: line.brand || undefined, peSize: line.pe || undefined, diameterMm: num(line.diameter), breakingLoadLb: num(line.load), color: line.color || undefined },
      leader: leader.brand || leader.diameter || leader.length ? { material: leader.material, customBrand: leader.brand || undefined, diameterMm: num(leader.diameter), lengthCm: num(leader.length) } : undefined,
    };
    save.mutate(dto, { onSuccess: () => goBack() });
  };

  return (
    <Page>
      <DetailTopBar title={id ? 'комплект' : 'новый комплект'} left={<Round icon={ArrowLeft} onPress={() => goBack()} />} right={id ? <Round icon={Trash2} onPress={() => del.mutate(id, { onSuccess: () => goBack() })} /> : undefined} />
      <PageTitle title={name || 'комплект'} subtitle="удилище → катушка → шнур → поводок → приманки" />
      <View style={{ gap: 12 }}>
        <Field label="название комплекта" value={name} onChangeText={setName} placeholder="Микроджиг до 5 г" />
        <Picker label="дисциплина" items={Object.values(Discipline).map((d) => ({ value: d, label: DISCIPLINE_LABELS_RU[d].toLowerCase() }))} value={discipline} onChange={setDiscipline} />
        <View style={row}>
          <View style={half}><Toggle label="основной комплект" value={isPrimary} onChange={setIsPrimary} /></View>
          <View style={half}><Picker label="видимость" items={Object.values(Visibility).map((v) => ({ value: v, label: VIS[v] }))} value={visibility} onChange={setVisibility} /></View>
        </View>

        <SectionHead title="удилище" />
        <Picker items={Object.values(RodType).map((v) => ({ value: v, label: ROD[v] }))} value={rod.type} onChange={(type) => setRod({ ...rod, type })} />
        <View style={row}>
          <View style={half}><Field label="бренд" value={rod.brand} onChangeText={(brand) => setRod({ ...rod, brand })} placeholder="Graphiteleader" /></View>
          <View style={half}><Field label="модель" value={rod.model} onChangeText={(model) => setRod({ ...rod, model })} placeholder="Corto" /></View>
        </View>
        <View style={row}>
          <View style={half}><Field label="длина, см" value={rod.lengthCm} onChangeText={(lengthCm) => setRod({ ...rod, lengthCm })} keyboardType="decimal-pad" placeholder="229" /></View>
          <View style={half}><Field label="тест от, г" value={rod.testMin} onChangeText={(testMin) => setRod({ ...rod, testMin })} keyboardType="decimal-pad" placeholder="0,6" /></View>
          <View style={half}><Field label="тест до, г" value={rod.testMax} onChangeText={(testMax) => setRod({ ...rod, testMax })} keyboardType="decimal-pad" placeholder="8" /></View>
        </View>

        <SectionHead title="катушка" />
        <Picker items={Object.values(ReelType).map((v) => ({ value: v, label: REEL[v] }))} value={reel.type} onChange={(type) => setReel({ ...reel, type })} />
        <View style={row}>
          <View style={half}><Field label="бренд" value={reel.brand} onChangeText={(brand) => setReel({ ...reel, brand })} placeholder="Shimano" /></View>
          <View style={half}><Field label="модель" value={reel.model} onChangeText={(model) => setReel({ ...reel, model })} placeholder="Vanquish" /></View>
        </View>
        <View style={row}>
          <View style={half}><Field label="размер" value={reel.size} onChangeText={(size) => setReel({ ...reel, size })} placeholder="C2000S" /></View>
          <View style={half}><Field label="передаточное" value={reel.ratio} onChangeText={(ratio) => setReel({ ...reel, ratio })} placeholder="5.1:1" /></View>
          <View style={half}><Field label="масса, г" value={reel.weight} onChangeText={(weight) => setReel({ ...reel, weight })} keyboardType="number-pad" placeholder="155" /></View>
        </View>

        <SectionHead title="основная леска" />
        <Picker items={Object.values(LineType).map((v) => ({ value: v, label: LINE[v] }))} value={line.type} onChange={(type) => setLine({ ...line, type })} />
        <View style={row}>
          <View style={{ flex: 2 }}><Field label="бренд / модель" value={line.brand} onChangeText={(brand) => setLine({ ...line, brand })} placeholder="YGK X-Braid Upgrade" /></View>
          <View style={half}><Field label="PE" value={line.pe} onChangeText={(pe) => setLine({ ...line, pe })} placeholder="#0.4" /></View>
        </View>
        <View style={row}>
          <View style={half}><Field label="диаметр, мм" value={line.diameter} onChangeText={(diameter) => setLine({ ...line, diameter })} keyboardType="decimal-pad" placeholder="0,104" /></View>
          <View style={half}><Field label="разрывная, lb" value={line.load} onChangeText={(load) => setLine({ ...line, load })} keyboardType="decimal-pad" placeholder="8" /></View>
          <View style={half}><Field label="цвет" value={line.color} onChangeText={(color) => setLine({ ...line, color })} placeholder="лайм" /></View>
        </View>

        <SectionHead title="поводок" />
        <Picker items={Object.values(LineType).map((v) => ({ value: v, label: LINE[v] }))} value={leader.material} onChange={(material) => setLeader({ ...leader, material })} />
        <View style={row}>
          <View style={half}><Field label="бренд" value={leader.brand} onChangeText={(brand) => setLeader({ ...leader, brand })} placeholder="Seaguar" /></View>
          <View style={half}><Field label="диаметр, мм" value={leader.diameter} onChangeText={(diameter) => setLeader({ ...leader, diameter })} keyboardType="decimal-pad" placeholder="0,2" /></View>
          <View style={half}><Field label="длина, см" value={leader.length} onChangeText={(length) => setLeader({ ...leader, length })} keyboardType="number-pad" placeholder="80" /></View>
        </View>

        <SectionHead title="приманки и оснастка" />
        <Field label="по одной в строке, вес — «3 г»" value={lures} onChangeText={setLures} multiline placeholder={'джиг-головка 3 г\nвиброхвост 2"\nмикроколебалка 2,5 г'} style={{ minHeight: 90, textAlignVertical: 'top' }} />
        <Field label="комментарий" value={comment} onChangeText={setComment} placeholder="для течения и глубины до 4 м" />

        {save.isError && <T size={10} color={colors.orange}>{String(save.error)}</T>}
        <LimeButton title={save.isPending ? 'сохраняем…' : 'сохранить комплект'} disabled={name.trim().length < 2 || save.isPending} onPress={submit} />
      </View>
    </Page>
  );
}
