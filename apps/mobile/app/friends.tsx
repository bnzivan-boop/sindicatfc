import { DISCIPLINE_LABELS_RU } from '@sindikat/domain';
import { router } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useMe } from '../src/auth/useAuth';
import { Avatar, DetailTopBar, EventTag, fontFamily, Page, PageTitle, Round, Surface, T } from '../src/components/ui';
import { Segmented } from '../src/features/community/components';
import { FriendButton } from '../src/features/friends/FriendButton';
import { useFriendSuggestions, useFriends, type FriendCard } from '../src/features/friends/useFriends';
import { useUserSearch } from '../src/features/registrations/useRegistrations';
import { goBack } from '../src/navigation';
import { useTheme } from '../src/theme/useTheme';

type Tab = 'friends' | 'requests' | 'suggest';

/** Друзья: список · заявки (входящие/исходящие) · рекомендации (стартовали вместе, одноклубники, общие друзья). */
export default function FriendsScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const { data } = useFriends(!!me.data);
  const sugg = useFriendSuggestions(!!me.data);
  const [tab, setTab] = useState<Tab>('friends');
  const [q, setQ] = useState('');
  const hits = useUserSearch(q);
  const incoming = data?.incoming.length ?? 0;

  const Row = ({ u, right, sub }: { u: FriendCard; right?: React.ReactNode; sub?: string }) => (
    <Surface radius={15} style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 }}>
        <Avatar name={u.displayName} size={36} />
        <View style={{ flex: 1 }}><T size={11} weight="500">{u.displayName}</T><T size={9} muted>{sub ?? [u.city, u.discipline ? `${DISCIPLINE_LABELS_RU[u.discipline as keyof typeof DISCIPLINE_LABELS_RU]?.toLowerCase()}${u.rank ? ` №${u.rank}` : ''}` : null].filter(Boolean).join(' · ')}</T></View>
      </Pressable>
      {right}
    </Surface>
  );

  return (
    <Page>
      <DetailTopBar title="друзья" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/profile')} />} />
      <PageTitle title="друзья" subtitle={`${data?.friends.length ?? 0} в друзьях${incoming ? ` · ${incoming} новых заявок` : ''}`} />
      <Segmented items={[{ value: 'friends', label: 'друзья' }, { value: 'requests', label: incoming ? `заявки · ${incoming}` : 'заявки' }, { value: 'suggest', label: 'кого добавить' }]} value={tab} onChange={setTab} />

      {tab === 'friends' && (
        <View style={{ gap: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 12 }}>
            <Search size={14} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="найти участника по имени" placeholderTextColor={colors.muted} style={[fontFamily, { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 12 }]} />
          </View>
          {q.trim().length >= 2 ? (
            <>
              {(hits.data ?? []).filter((h) => h.id !== me.data?.id).map((h) => <Row key={h.id} u={{ id: h.id, displayName: h.displayName, city: h.city, discipline: h.discipline, rank: null }} right={<FriendButton userId={h.id} compact />} />)}
              {hits.data?.length === 0 && <T size={10} muted>Никого не нашли</T>}
            </>
          ) : (
            <>
              {(data?.friends ?? []).length === 0 && <Surface><T size={10} muted>Пока никого. Добавьте тех, с кем стартовали — они на вкладке «кого добавить».</T></Surface>}
              {(data?.friends ?? []).map((u) => <Row key={u.id} u={u} right={<FriendButton userId={u.id} state="FRIENDS" compact />} />)}
            </>
          )}
        </View>
      )}

      {tab === 'requests' && (
        <View style={{ gap: 7 }}>
          {incoming > 0 && <T size={10} weight="500" style={{ marginTop: 4 }}>входящие</T>}
          {(data?.incoming ?? []).map((u) => <Row key={u.id} u={u} right={<FriendButton userId={u.id} state="INCOMING" compact />} />)}
          {(data?.outgoing ?? []).length > 0 && <T size={10} weight="500" style={{ marginTop: 8 }}>исходящие</T>}
          {(data?.outgoing ?? []).map((u) => <Row key={u.id} u={u} right={<FriendButton userId={u.id} state="OUTGOING" compact />} />)}
          {incoming === 0 && (data?.outgoing ?? []).length === 0 && <Surface><T size={10} muted>Заявок нет</T></Surface>}
        </View>
      )}

      {tab === 'suggest' && (
        <View style={{ gap: 7 }}>
          {(sugg.data ?? []).length === 0 && <Surface><T size={10} muted>{sugg.isLoading ? 'Подбираем…' : 'Пока нечего предложить — поучаствуйте в старте или вступите в клуб'}</T></Surface>}
          {(sugg.data ?? []).map((u) => (
            <Surface key={u.id} radius={15} style={{ padding: 10, gap: 8 }}>
              <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Avatar name={u.displayName} size={36} />
                <View style={{ flex: 1 }}><T size={11} weight="500">{u.displayName}</T><T size={9} muted>{[u.city, u.discipline ? DISCIPLINE_LABELS_RU[u.discipline as keyof typeof DISCIPLINE_LABELS_RU]?.toLowerCase() : null].filter(Boolean).join(' · ')}</T></View>
                <FriendButton userId={u.id} state="NONE" compact />
              </Pressable>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{u.reasons.map((r) => <EventTag key={r} plain>{r}</EventTag>)}</View>
            </Surface>
          ))}
        </View>
      )}
    </Page>
  );
}
