import { useQuery } from '@tanstack/react-query';
import { DISCIPLINE_LABELS_RU, WATER_TYPE_LABELS_RU, type PublicProfile, type TrophyCard, type UpsertGearKit } from '@sindikat/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Award, Fish, FishSymbol, Heart, MessageCircle, Sailboat, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../../src/api/client';
import { LEVEL_LABEL, plural } from '../../src/api/helpers';
import { useMe } from '../../src/auth/useAuth';
import { Avatar, DeepCard, DetailTopBar, EventTag, FilterRow, fontFamily, InfoList, InfoRow, Page, Round, SectionHead, Stats, Surface, T } from '../../src/components/ui';
import { goBack } from '../../src/navigation';
import { whiteAlpha } from '../../src/theme/tokens';
import { FriendButton } from '../../src/features/friends/FriendButton';
import type { FriendState } from '../../src/features/friends/useFriends';
import { useTheme } from '../../src/theme/useTheme';

type Profile = Omit<PublicProfile, 'memberSince' | 'history'> & { memberSince: string; history: Array<Omit<PublicProfile['history'][number], 'startsAt'> & { startsAt: string }>; friendship: { state: FriendState; mutual: number } };
type Sort = 'date' | 'species' | 'weight' | 'length';

/** Публичный профиль (концепция «Отображение в приложении» + вкладка «Трофеи»). Без телефона, точных координат и документов. */
export default function PublicProfileScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [sort, setSort] = useState<Sort>('date');
  const [allHistory, setAllHistory] = useState(false);
  const profile = useQuery({ queryKey: ['public-profile', id], queryFn: () => api<Profile>(`/users/${id}`, { auth: false }), enabled: !!id });
  const kits = useQuery({ queryKey: ['public-kits', id], queryFn: () => api<{ kits: Array<UpsertGearKit & { id: string }>; boat: { type: string; customName: string | null; lengthCm: number | null; seats: number | null; equipment: { motor?: { powerHp?: number } } | null } | null; hiddenForFriends: number }>(`/users/${id}/gear-kits`, { auth: false }), enabled: !!id });
  const trophies = useQuery({ queryKey: ['public-trophies', id, sort], queryFn: () => api<TrophyCard[]>(`/users/${id}/trophies?sort=${sort}&order=desc`, { auth: false }), enabled: !!id });

  if (me.data?.id === id) { router.replace('/(tabs)/profile'); return null; }
  const p = profile.data;
  if (!p) return <Page><DetailTopBar title="профиль" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} /><T muted>{profile.isError ? 'Профиль не найден' : 'Загрузка…'}</T></Page>;
  const primary = p.season[0];
  const kg = (g: number | null) => (g === null ? '' : g >= 1000 ? `${(g / 1000).toFixed(2)} кг` : `${g} г`);

  return (
    <Page>
      <DetailTopBar title="участник" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} right={<Round icon={Share2} />} />
      <DeepCard style={{ borderRadius: 23, padding: 17, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {p.avatarUrl ? <Image source={{ uri: p.avatarUrl }} style={{ width: 62, height: 62, borderRadius: 19 }} /> : <Avatar name={p.displayName} size={62} lime radius={19} />}
          <View style={{ flex: 1 }}>
            <Text style={[fontFamily, { fontSize: 21, fontWeight: '500', letterSpacing: -0.8, color: colors.white, marginBottom: 4 }]}>{p.displayName}</Text>
            <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(70) }]}>{[p.city, primary ? `${DISCIPLINE_LABELS_RU[primary.discipline]} №${primary.rank}` : null, `участник с ${new Date(p.memberSince).getFullYear()}`].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {p.disciplines.map((d) => <View key={d} style={{ backgroundColor: whiteAlpha(12), borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={[fontFamily, { fontSize: 9, color: colors.white }]}>{DISCIPLINE_LABELS_RU[d].toLowerCase()}</Text></View>)}
          {p.experienceYears ? <View style={{ backgroundColor: whiteAlpha(12), borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={[fontFamily, { fontSize: 9, color: colors.white }]}>стаж {p.experienceYears} {plural(p.experienceYears, 'год', 'года', 'лет')}</Text></View> : null}
        </View>
        {p.bio ? <Text style={[fontFamily, { fontSize: 10, lineHeight: 15, color: whiteAlpha(75), marginTop: 12 }]}>{p.bio}</Text> : null}
      </DeepCard>
      <View style={{ flexDirection: 'row', gap: 7, marginBottom: 6, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><FriendButton userId={p.id} state={p.friendship.state} mutual={p.friendship.mutual} /></View>
        <Pressable onPress={() => router.push('/community/messages')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 }}><MessageCircle size={13} color={colors.text} /><T size={10}>написать</T></Pressable>
        <Pressable onPress={() => router.push({ pathname: '/community/create', params: { kind: 'trip', invite: p.id } })} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 }}><T size={10}>на рыбалку</T></Pressable>
      </View>
      <Stats items={[{ label: 'стартов', value: String(p.history.length) }, { label: 'подиумы', value: String(p.podiums) }, { label: 'победы', value: String(p.wins) }]} />

      {/* ── арсенал ── */}
      <SectionHead title="арсенал" tag={kits.data ? String(kits.data.kits.length + (kits.data.boat ? 1 : 0)) : undefined} />
      <InfoList>
        {(kits.data?.kits ?? []).length === 0 && !kits.data?.boat && <InfoRow icon={FishSymbol} label="арсенал" value={kits.data?.hiddenForFriends ? `${kits.data.hiddenForFriends} комплект(а) видны только друзьям` : 'комплекты скрыты или не добавлены'} />}
        {(kits.data?.kits.length ?? 0) > 0 && (kits.data?.hiddenForFriends ?? 0) > 0 && <InfoRow icon={FishSymbol} label="ещё" value={`${kits.data!.hiddenForFriends} комплект(а) видны только друзьям`} />}
        {(kits.data?.kits ?? []).map((k) => (
          <InfoRow key={k.id} icon={FishSymbol} label={`${DISCIPLINE_LABELS_RU[k.discipline].toLowerCase()} · ${k.isPrimary ? 'основной' : 'запасной'}`} value={[k.rod?.customBrand, k.rod?.customModel, k.rod?.lureTestMinG !== undefined ? `${k.rod.lureTestMinG}–${k.rod.lureTestMaxG} г` : null, k.reel?.customBrand ? `· ${k.reel.customBrand} ${k.reel.customModel ?? ''}` : null, k.mainLine?.peSize ? `· PE ${k.mainLine.peSize}` : null].filter(Boolean).join(' ') || k.name} />
        ))}
        {kits.data?.boat && <InfoRow icon={Sailboat} label="лодка" value={[kits.data.boat.customName ?? kits.data.boat.type, kits.data.boat.lengthCm ? `${(kits.data.boat.lengthCm / 100).toFixed(1)} м` : null, kits.data.boat.equipment?.motor?.powerHp ? `мотор ${kits.data.boat.equipment.motor.powerHp} л.с.` : null].filter(Boolean).join(' · ')} />}
      </InfoList>
      {p.waterTypes.length > 0 && <View style={{ marginTop: 8 }}><T size={9} muted>ловит: {p.waterTypes.map((w) => WATER_TYPE_LABELS_RU[w]).join(', ')}</T></View>}

      {/* ── сезоны: карточки свайпом ── */}
      {p.season.length > 0 && (
        <>
          <SectionHead title="сезон" tag={`${p.season.length} ${plural(p.season.length, 'дисциплина', 'дисциплины', 'дисциплин')}`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
            {p.season.map((sn, i) => {
              const top = sn.rank <= 3;
              return (
                <View key={sn.discipline} style={{ width: 132, backgroundColor: i === 0 ? colors.deep : colors.surface, borderWidth: 1, borderColor: i === 0 ? 'transparent' : colors.line, borderRadius: 17, padding: 12, gap: 2 }}>
                  <Text style={[fontFamily, { fontSize: 9, color: i === 0 ? whiteAlpha(65) : colors.muted, textTransform: 'lowercase' }]}>{DISCIPLINE_LABELS_RU[sn.discipline]}{i === 0 ? ' · основная' : ''}</Text>
                  <Text style={[fontFamily, { fontSize: 30, lineHeight: 32, fontWeight: '500', letterSpacing: -1.4, color: i === 0 ? (top ? colors.lime : colors.white) : top ? colors.green : colors.text, marginTop: 6 }]}>#{sn.rank}</Text>
                  <Text style={[fontFamily, { fontSize: 11, fontWeight: '500', color: i === 0 ? colors.white : colors.text }]}>{sn.points.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} очков</Text>
                  <Text style={[fontFamily, { fontSize: 9, color: i === 0 ? whiteAlpha(65) : colors.muted }]}>{sn.starts} {plural(sn.starts, 'старт', 'старта', 'стартов')}</Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* ── трофеи ── */}
      <SectionHead title="трофеи" tag={String(trophies.data?.length ?? 0)} />
      {(trophies.data?.length ?? 0) > 0 && <FilterRow items={[{ value: 'date' as Sort, label: 'по дате' }, { value: 'length' as Sort, label: 'по длине' }, { value: 'weight' as Sort, label: 'по весу' }, { value: 'species' as Sort, label: 'по виду' }]} value={sort} onChange={setSort} />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(trophies.data ?? []).length === 0 && <Surface style={{ width: '100%' }}><T size={10} muted>Трофеев пока нет</T></Surface>}
        {(trophies.data ?? []).map((t) => (
          <Pressable key={t.id} onPress={() => router.push({ pathname: '/trophy/[id]', params: { id: t.id } })} style={{ width: '48%' }}>
          <Surface radius={17} style={{ padding: 0, overflow: 'hidden' }}>
            {t.photos[0] ? <Image source={{ uri: t.photos[0] }} style={{ width: '100%', aspectRatio: 1 }} /> : <View style={{ width: '100%', aspectRatio: 1.4, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center' }}><Fish size={26} color={colors.lime} strokeWidth={1.4} /></View>}
            <View style={{ padding: 10, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><T size={11} weight="500">{t.species}</T>{t.isPersonalRecord && <Award size={11} color={colors.green} />}</View>
              <T size={10}>{[t.lengthMm ? `${t.lengthMm / 10} см` : null, kg(t.weightG)].filter(Boolean).join(' · ')}</T>
              <T size={8} muted numberOfLines={1}>{[t.waterbody, t.gearSummary, t.tournamentTitle].filter(Boolean).join(' · ') || new Date(t.caughtAt).toLocaleDateString('ru-RU')}</T>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Heart size={10} color={t.likes ? colors.green : colors.muted} fill={t.likes ? colors.green : 'transparent'} strokeWidth={1.6} /><T size={9} color={t.likes ? colors.text : colors.muted}>{t.likes}</T></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><MessageCircle size={10} color={t.comments ? colors.text : colors.muted} strokeWidth={1.6} /><T size={9} color={t.comments ? colors.text : colors.muted}>{t.comments}</T></View>
              </View>
            </View>
          </Surface>
          </Pressable>
        ))}
      </View>

      {/* ── история участий: 5 последних + «показать все» ── */}
      <SectionHead title="история участий" tag={String(p.history.length)} />
      <View style={{ gap: 6 }}>
        {p.history.length === 0 && <Surface><T size={10} muted>Стартов пока нет</T></Surface>}
        {(allHistory ? p.history : p.history.slice(0, 5)).map((h) => (
          <Pressable key={h.tournamentId} onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: h.tournamentId } })}>
            <Surface radius={15} style={{ padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: h.place && h.place <= 3 ? colors.lime : colors.surface2, alignItems: 'center', justifyContent: 'center' }}><T size={12} weight="500" color={h.place && h.place <= 3 ? colors.onLime : colors.text}>{h.place ?? '—'}</T></View>
              <View style={{ flex: 1 }}><T size={11} weight="500">{h.title}</T><T size={9} muted>{new Date(h.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {h.place ? `${h.place} из ${h.fieldSize}` : 'без зачёта'}</T></View>
              <EventTag plain>{LEVEL_LABEL[h.level as keyof typeof LEVEL_LABEL] ?? h.level.toLowerCase()}</EventTag>
            </Surface>
          </Pressable>
        ))}
        {p.history.length > 5 && (
          <Pressable onPress={() => setAllHistory(!allHistory)} style={{ alignItems: 'center', padding: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, borderStyle: 'dashed' }}>
            <T size={10} color={colors.green}>{allHistory ? 'свернуть' : `показать все ${p.history.length} ${plural(p.history.length, 'старт', 'старта', 'стартов')}`}</T>
          </Pressable>
        )}
      </View>
    </Page>
  );
}
