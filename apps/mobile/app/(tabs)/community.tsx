import { router } from 'expo-router';
import { CalendarPlus, MessageCircle, Plus, Search, ShieldPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Avatar, Brand, EventTag, FilterRow, Page, PageTitle, Round, SectionHead, Surface, T, TopBar } from '../../src/components/ui';
import { CreateRow, Mark, PostCard, Segmented } from '../../src/features/community/components';
import { DISCIPLINE_LABELS_RU } from '@sindikat/domain';
import { useMe } from '../../src/auth/useAuth';
import { useChannels, useClubs, useDecideTrip, useJoinTrip, useMatches, usePosts, useTrips, when, type ChannelRow } from '../../src/features/community/useCommunity';
import { TrophyFeedCard } from '../../src/features/trophies/TrophyFeedCard';
import { useTrophyFeed } from '../../src/features/trophies/useTrophies';
import { useTheme } from '../../src/theme/useTheme';

type Tab = 'feed' | 'channels' | 'company' | 'clubs';

/** community-view прототипа: лента · каналы · выезды · клубы. Данные моковые (см. features/community/mock.ts). */
export default function CommunityScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('feed');
  const [feedFilter, setFeedFilter] = useState<'for-you' | 'subs' | 'near'>('for-you');
  const [company, setCompany] = useState<'trips' | 'people'>('trips');
  const me = useMe();
  const trips = useTrips();
  const matches = useMatches();
  const clubs = useClubs();
  const joinTrip = useJoinTrip();
  const decideTrip = useDecideTrip();
  const [invited, setInvited] = useState<Record<string, boolean>>({});
  const scope = feedFilter === 'subs' ? 'friends' : 'all';
  const feed = useTrophyFeed(scope);
  const posts = usePosts(undefined, scope);
  const channels = useChannels();
  const timeline = [
    ...(feed.data?.items ?? []).map((t) => ({ kind: 'trophy' as const, at: t.publishedAt, t })),
    ...(posts.data ?? []).map((p) => ({ kind: 'post' as const, at: p.createdAt, p })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <Page>
      <TopBar left={<Brand />} right={<><Round icon={MessageCircle} notice onPress={() => router.push('/community/messages')} /><Round icon={Search} /></>} />
      <PageTitle title="сообщество" subtitle="москва и область · 8 420 участников" />
      <Segmented items={[{ value: 'feed', label: 'лента' }, { value: 'channels', label: 'каналы' }, { value: 'company', label: 'выезды' }, { value: 'clubs', label: 'клубы' }]} value={tab} onChange={setTab} />

      {tab === 'feed' && (
        <>
          <FilterRow items={[{ value: 'for-you' as const, label: 'для вас' }, { value: 'subs' as const, label: 'подписки' }, { value: 'near' as const, label: 'рядом' }]} value={feedFilter} onChange={setFeedFilter} />
          <View style={{ gap: 10 }}>
            {timeline.length === 0 && <Surface><T size={10} muted>{feed.isLoading || posts.isLoading ? 'Загрузка…' : feedFilter === 'subs' ? 'Здесь публикации друзей и ваших каналов. Добавьте друзей — они на вкладке «кого добавить» в профиле.' : 'Лента пуста'}</T></Surface>}
            {timeline.map((x) => (x.kind === 'trophy' ? <TrophyFeedCard key={`t-${x.t.id}`} item={x.t} /> : <PostCard key={`p-${x.p.id}`} post={x.p} onOpen={() => router.push({ pathname: '/community/topic/[id]', params: { id: x.p.id } })} />))}
          </View>
        </>
      )}

      {tab === 'channels' && (
        <View style={{ gap: 8 }}>
          <CreateRow icon={Plus} title="создать локальный канал" sub="свой город, водоём или дисциплина" onPress={() => router.push('/community/create?kind=channel')} />
          <SectionHead title="официальные" />
          {(channels.data ?? []).filter((c) => c.kind === 'OFFICIAL').map((c) => <ChannelItem key={c.id} c={c} />)}
          <SectionHead title="локальные рядом" action="все" />
          {(channels.data ?? []).filter((c) => c.kind === 'LOCAL').map((c) => <ChannelItem key={c.id} c={c} />)}
        </View>
      )}

      {tab === 'company' && (
        <View style={{ gap: 8 }}>
          <CreateRow icon={CalendarPlus} title="предложить совместный выезд" sub="укажите место, время и свободные места" onPress={() => router.push('/community/create?kind=trip')} />
          <Segmented items={[{ value: 'trips', label: 'готовые выезды' }, { value: 'people', label: 'подобрать людей' }]} value={company} onChange={setCompany} />
          {company === 'trips' ? (
            <>
              <SectionHead title="ближайшие выезды" action="фильтры" />
              {(trips.data ?? []).length === 0 && <Surface><T size={10} muted>{trips.isLoading ? 'Загрузка…' : 'Выездов пока нет — предложите свой'}</T></Surface>}
              {(trips.data ?? []).map((t) => (
                <Surface key={t.id} radius={17} style={{ padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T size={9} color={colors.green}>{when(t.startsAt)}</T><T size={9} muted>{t.seatsLeft ? `ещё ${t.seatsLeft} ${t.seatsLeft === 1 ? 'место' : t.seatsLeft < 5 ? 'места' : 'мест'}` : 'мест нет'}</T></View>
                  <T size={13} weight="500">{t.title}</T>
                  <T size={10} muted>{t.place}{t.details ? ` · ${t.details}` : ''}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <Pressable onPress={() => router.push(t.author.id === me.data?.id ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: t.author.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Avatar name={t.author.displayName} size={24} /><T size={10}>{t.author.displayName.split(' ')[0]} · {t.author.meta}</T></Pressable>
                    {t.isAuthor ? <T size={9} color={colors.green}>вы организатор{t.requests.length ? ` · ${t.requests.length} заявок` : ''}</T> : (
                      <Pressable onPress={() => (me.data ? joinTrip.mutate(t.id) : router.push('/onboarding'))} disabled={!t.seatsLeft && !t.myStatus} style={{ backgroundColor: t.myStatus === 'INVITED' ? colors.lime : t.myStatus ? colors.surface2 : colors.text, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, opacity: !t.seatsLeft && !t.myStatus ? 0.5 : 1 }}><T size={9} color={t.myStatus === 'INVITED' ? colors.onLime : t.myStatus ? colors.text : colors.bg}>{t.myStatus === 'ACCEPTED' ? 'вы едете' : t.myStatus === 'REQUESTED' ? 'запрос отправлен' : t.myStatus === 'INVITED' ? 'вас зовут · принять' : t.myStatus === 'DECLINED' ? 'отказано' : 'присоединиться'}</T></Pressable>
                    )}
                  </View>
                  {t.isAuthor && t.requests.map((uid) => (
                    <View key={uid} style={{ flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 6 }}>
                      <T size={10} style={{ flex: 1 }}>заявка от участника</T>
                      <Pressable onPress={() => decideTrip.mutate({ id: t.id, userId: uid, accept: true })} style={{ backgroundColor: colors.lime, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}><T size={9} color={colors.onLime}>взять</T></Pressable>
                      <Pressable onPress={() => decideTrip.mutate({ id: t.id, userId: uid, accept: false })} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}><T size={9}>отказать</T></Pressable>
                    </View>
                  ))}
                </Surface>
              ))}
            </>
          ) : (
            <>
              <SectionHead title="подходят вам" action="настроить" />
              {(matches.data ?? []).length === 0 && <Surface><T size={10} muted>{me.data ? 'Заполните дисциплины в профиле — подберём компанию' : 'Войдите, чтобы подобрать компанию'}</T></Surface>}
              {(matches.data ?? []).map((m) => (
                <Surface key={m.id} radius={17} style={{ padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <Avatar name={m.displayName} size={36} />
                    <View style={{ flex: 1 }}><T size={11} weight="500">{m.displayName}</T><T size={9} muted>{m.city ?? 'город не указан'}</T></View>
                    <T size={14} weight="500" color={colors.green}>{m.score}%</T>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{m.reasons.map((r) => <EventTag key={r} plain>{r}</EventTag>)}</View>
                  <View style={{ flexDirection: 'row', gap: 7 }}>
                    <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: m.id } })} style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 11, padding: 9, alignItems: 'center' }}><T size={9}>профиль</T></Pressable>
                    <Pressable onPress={() => setInvited({ ...invited, [m.id]: true })} style={{ flex: 1, backgroundColor: invited[m.id] ? colors.surface2 : colors.text, borderRadius: 11, padding: 9, alignItems: 'center' }}><T size={9} color={invited[m.id] ? colors.text : colors.bg}>{invited[m.id] ? 'приглашение отправлено' : 'позвать'}</T></Pressable>
                  </View>
                </Surface>
              ))}
            </>
          )}
        </View>
      )}

      {tab === 'clubs' && (
        <View style={{ gap: 8 }}>
          <CreateRow icon={ShieldPlus} title="создать клуб или команду" sub="состав, роли, результаты и набор игроков" onPress={() => router.push('/community/create?kind=club')} />
          <SectionHead title="клубы" action="фильтры" />
          {(clubs.data ?? []).map((c) => (
            <Pressable key={c.id} onPress={() => router.push({ pathname: '/community/club/[id]', params: { id: c.id } })}>
              <Surface radius={17} style={{ padding: 12, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <Mark text={c.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')} />
                  <View style={{ flex: 1 }}><T size={11} weight="500">{c.name}</T><T size={9} muted>{[c.city, DISCIPLINE_LABELS_RU[c.discipline as keyof typeof DISCIPLINE_LABELS_RU]?.toLowerCase(), c.recruiting ? 'открыт набор' : 'набор закрыт', c.myRole === 'CAPTAIN' ? 'вы капитан' : c.myRole === 'ATHLETE' ? 'вы в составе' : c.myRole === 'APPLICANT' ? 'заявка подана' : null].filter(Boolean).join(' · ')}</T></View>
                  <EventTag>топ-{c.rank}</EventTag>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {[[c.members, 'участников'], [c.points.toLocaleString('ru-RU'), 'очков клуба']].map(([v, l]) => <View key={String(l)}><T size={11} weight="500">{String(v)}</T><T size={8} muted>{String(l)}</T></View>)}
                </View>
              </Surface>
            </Pressable>
          ))}
        </View>
      )}
    </Page>
  );
}

function ChannelItem({ c }: { c: ChannelRow }) {
  const { colors } = useTheme();
  const mark = c.name.split(/[\s·]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <Pressable onPress={() => router.push({ pathname: '/community/channel/[id]', params: { id: c.id } })}>
      <Surface radius={15} style={{ padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <Mark text={mark} official={c.kind === 'OFFICIAL'} />
        <View style={{ flex: 1 }}><T size={11} weight="500">{c.name}</T><T size={9} muted numberOfLines={1}>{c.lastPost ?? c.description ?? ''}</T></View>
        <View style={{ alignItems: 'flex-end' }}><T size={9} weight="500" color={c.joined ? colors.green : colors.text}>{c.joined ? 'вы участник' : c.kind === 'OFFICIAL' ? 'официальный' : `${c.posts} постов`}</T><T size={9} muted>{c.members}</T></View>
      </Surface>
    </Pressable>
  );
}
