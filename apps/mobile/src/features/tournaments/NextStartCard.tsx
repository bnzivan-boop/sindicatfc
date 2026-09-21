import type { TournamentSummary } from '@sindikat/domain';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import ArrowRight from '../../../assets/figma/arrow-right.svg';
import { hours, MONTHS_GEN, moneyTight, STATUS_LABEL, time } from '../../api/helpers';
import { Body, Display, LimeChip } from '../../components/figma/ui';
import { figma } from '../../theme/figma';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Карточка «Ближайший старт» по макету Figma (Frame 2147240452): дата, статус, название, старт/где/длительность, участники и цена. */
export function NextStartCard({ t }: { t: TournamentSummary }) {
  const d = new Date(t.startsAt);
  return (
    <Link href={{ pathname: '/tournament/[id]', params: { id: t.id } }} asChild>
      <Pressable style={{ backgroundColor: figma.card, borderRadius: 20, padding: 10, gap: 10, shadowColor: '#000', shadowOpacity: 0.75, shadowRadius: 7, shadowOffset: { width: 0, height: 14 }, elevation: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: figma.white20 }}>
          <View style={{ width: 84, height: 105, borderRadius: 10, backgroundColor: figma.dateBlock, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Display size={58} lineHeight={42} color="#FFFFFF" style={{ marginTop: 8 }}>{String(d.getDate()).padStart(2, '0')}</Display>
            <Body size={10} weight="medium" color="#FFFFFF">{cap(MONTHS_GEN[d.getMonth()]!)}</Body>
          </View>
          <View style={{ flex: 1, gap: 9 }}>
            <LimeChip>{cap(STATUS_LABEL[t.status] ?? t.status.toLowerCase())}</LimeChip>
            <Display size={36} lineHeight={30} color="#FFFFFF">{t.title}</Display>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Meta label="Старт:" value={time(t.startsAt)} />
              <Meta label="Где:" value={t.locationTitle} flex />
              <Meta label="Длительность:" value={hours(t.startsAt, t.endsAt)} />
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Body size={12} weight="semibold" color="#FFFFFF">{String(t.registeredCount)}</Body>
            <Body size={12} color={figma.white40}>из {t.capacity} участников</Body>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Body size={14} weight="semibold" color={figma.lime}>{t.entryFee ? moneyTight(t.entryFee.amountMinor) : 'бесплатно'}</Body>
            <ArrowRight width={9} height={8} color={figma.lime} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function Meta({ label, value, flex }: { label: string; value: string; flex?: boolean }) {
  return (
    <View style={{ gap: 3, flexShrink: flex ? 1 : 0 }}>
      <Body size={8} weight="medium" color={figma.white40}>{label}</Body>
      <Body size={14} weight="semibold" color="#FFFFFF" numberOfLines={1}>{value}</Body>
    </View>
  );
}
