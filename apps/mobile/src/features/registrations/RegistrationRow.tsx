import { DISCIPLINE_LABELS_RU, type Discipline } from '@sindikat/domain';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import CheckIcon from '../../../assets/figma/check-round.svg';
import { MONTHS_SHORT } from '../../api/helpers';
import { Body, Display } from '../../components/figma/ui';
import { figma } from '../../theme/figma';
import { STATUS_RU, type Registration } from './useRegistrations';

const FORMAT_SHORT: Record<string, string> = { SOLO: 'Личный', PAIR: 'Парный', TEAM: 'Командный', CREW: 'Экипаж' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Строка «Мои заявки» по макету Figma (компонент «Турниры»): бейдж даты, название, формат / дисциплина, статус. */
export function RegistrationRow({ r }: { r: Registration }) {
  const d = new Date(r.tournament?.startsAt ?? 0);
  const confirmed = r.status === 'CONFIRMED' || r.status === 'CHECKED_IN';
  const discipline = r.tournament?.discipline ? DISCIPLINE_LABELS_RU[r.tournament.discipline as Discipline] : undefined;
  return (
    <Pressable onPress={() => router.push({ pathname: '/registration/[id]', params: { id: r.id } })} style={{ height: 50, backgroundColor: figma.card, borderRadius: 10, paddingLeft: 5, paddingRight: 16, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 }}>
        <View style={{ width: 90, height: 40, borderRadius: 8, backgroundColor: figma.dateBadge, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 2, top: 2, width: 33, height: 36, borderRadius: 7, backgroundColor: '#FFFFFF', alignItems: 'center' }}>
            <Display size={28} lineHeight={22} color="#000000" style={{ marginTop: 4 }}>{String(d.getDate()).padStart(2, '0')}</Display>
            <Body size={6} lineHeight={7} weight="medium" color="#000000">{MONTHS_SHORT[d.getMonth()]}</Body>
          </View>
        </View>
        <View style={{ gap: 2, flex: 1 }}>
          <Body size={14} weight="semibold" color="#FFFFFF" numberOfLines={1}>{r.tournament?.title}</Body>
          <Body size={11} color="#FFFFFF">{[FORMAT_SHORT[r.format] ?? r.format, discipline, r.startNumber ? `№${r.startNumber}` : null].filter(Boolean).join(' / ')}</Body>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: figma.statusChip, borderRadius: 6, padding: 4 }}>
        {confirmed ? <CheckIcon width={7} height={7} color={figma.lime} /> : null}
        <Body size={8} color={confirmed ? figma.lime : '#FFFFFF'}>{cap(STATUS_RU[r.status])}</Body>
      </View>
    </Pressable>
  );
}
