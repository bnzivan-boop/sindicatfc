import { goBack } from '../../src/navigation';
import { BoatType, type UpsertBoat } from '@sindikat/domain';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Field } from '../../src/components/Field';
import { Picker, Toggle } from '../../src/components/Picker';
import { DetailTopBar, LimeButton, Page, PageTitle, Round, SectionHead, Surface, T } from '../../src/components/ui';
import { useBoat, useSaveBoat } from '../../src/features/gear/useGear';
import { useTheme } from '../../src/theme/useTheme';

const BOAT: Record<BoatType, string> = { PVC: 'ПВХ', RIB: 'RIB', ALUMINIUM: 'алюминий', PLASTIC: 'пластик', OTHER: 'другая' };
const num = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : undefined);

/** Карточка лодки (концепция «Лодка»). Регистрационный номер и документы — отдельный приватный контур, этап 4. */
export default function BoatScreen() {
  const { colors } = useTheme();
  const boat = useBoat();
  const save = useSaveBoat();
  const [type, setType] = useState<BoatType>('PVC');
  const [name, setName] = useState('');
  const [length, setLength] = useState('');
  const [seats, setSeats] = useState('');
  const [capacity, setCapacity] = useState('');
  const [motor, setMotor] = useState('');
  const [power, setPower] = useState('');
  const [electric, setElectric] = useState('');
  const [sonar, setSonar] = useState('');
  const [trailer, setTrailer] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const b = boat.data;
    if (!b) return;
    setType(b.type as BoatType); setName(b.customName ?? ''); setLength(b.lengthCm?.toString() ?? ''); setSeats(b.seats?.toString() ?? ''); setCapacity(b.capacityKg?.toString() ?? '');
    setMotor([b.equipment?.motor?.customBrand, b.equipment?.motor?.customModel].filter(Boolean).join(' ')); setPower(b.equipment?.motor?.powerHp?.toString() ?? '');
    setElectric(b.equipment?.electricMotor ?? ''); setSonar(b.equipment?.sonar ?? ''); setTrailer(!!b.equipment?.trailer); setShared(b.availableForTeamTrips);
  }, [boat.data]);

  const submit = () => {
    const [mb, ...mm] = motor.trim().split(' ');
    const dto: UpsertBoat = {
      type, customModel: name || undefined, lengthCm: num(length) ? Math.round(num(length)!) : undefined, seats: num(seats), capacityKg: num(capacity),
      motor: motor ? { customBrand: mb, customModel: mm.join(' ') || undefined, powerHp: num(power) } : undefined,
      electricMotor: electric || undefined, sonar: sonar || undefined, trailer, availableForTeamTrips: shared, visibility: 'PUBLIC',
    };
    save.mutate(dto, { onSuccess: () => goBack() });
  };
  const half = { flex: 1 } as const;

  return (
    <Page>
      <DetailTopBar title="лодка" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} />
      <PageTitle title="моя лодка" subtitle="для лодочных турниров и совместных выездов" />
      <View style={{ gap: 12 }}>
        <Picker label="тип" items={Object.values(BoatType).map((v) => ({ value: v, label: BOAT[v] }))} value={type} onChange={setType} />
        <Field label="бренд и модель" value={name} onChangeText={setName} placeholder="Gladiator E330" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={half}><Field label="длина, см" value={length} onChangeText={setLength} keyboardType="number-pad" placeholder="330" /></View>
          <View style={half}><Field label="мест" value={seats} onChangeText={setSeats} keyboardType="number-pad" placeholder="3" /></View>
          <View style={half}><Field label="грузоподъёмность, кг" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholder="450" /></View>
        </View>
        <SectionHead title="мотор и оборудование" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 2 }}><Field label="мотор (бренд модель)" value={motor} onChangeText={setMotor} placeholder="Tohatsu M9.8" /></View>
          <View style={half}><Field label="л.с." value={power} onChangeText={setPower} keyboardType="decimal-pad" placeholder="9.8" /></View>
        </View>
        <Field label="электромотор" value={electric} onChangeText={setElectric} placeholder="Minn Kota Endura 45" />
        <Field label="эхолот / картплоттер" value={sonar} onChangeText={setSonar} placeholder="Garmin Striker 4" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={half}><Toggle label="прицеп" value={trailer} onChange={setTrailer} /></View>
          <View style={half}><Toggle label="доступна для выездов" value={shared} onChange={setShared} /></View>
        </View>
        <Surface radius={14} style={{ padding: 12 }}><T size={10} muted>Регистрационный номер и документы не публикуются: их видит только владелец и организатор конкретного лодочного турнира. Загрузка — этап 4.</T></Surface>
        {save.isError && <T size={10} color={colors.orange}>{String(save.error)}</T>}
        <LimeButton title={save.isPending ? 'сохраняем…' : 'сохранить'} disabled={save.isPending} onPress={submit} />
      </View>
    </Page>
  );
}
