import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, MessagesSquare, Package, Settings2, SquarePen, Trophy, Users, Waves, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMe } from '../../../src/auth/useAuth';
import { Avatar, DeepCard, DetailTopBar, fontDisplay, fontFamily, Page, Round, SectionHead, Surface, T } from '../../../src/components/ui';
import { Mark, PostCard, Segmented } from '../../../src/features/community/components';
import { useChannel, useJoinChannel, usePosts } from '../../../src/features/community/useCommunity';
import { goBack } from '../../../src/navigation';
import { whiteAlpha } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/useTheme';

const RUBRIC_ICON: Record<string, LucideIcon> = { водоёмы: Waves, снасти: Package, отчёты: ImageIcon, флудилка: MessagesSquare, компания: Users, турниры: Trophy, напарники: Users };

/** channel-view прототипа на реальных данных: шапка, вступить, лента / рубрики / о канале. События — этап 5 (выезды). */
export default function ChannelScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { data: c } = useChannel(id);
  const posts = usePosts(id);
  const join = useJoinChannel(id);
  const [tab, setTab] = useState<'feed' | 'rubrics' | 'about'>('feed');
  const [rubric, setRubric] = useState<string | null>(null);

  if (!c) return <Page><DetailTopBar title="канал" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} /><T muted>Загрузка…</T></Page>;
  const mark = c.name.split(/[\s·]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const list = (posts.data ?? []).filter((p) => !rubric || p.rubric === rubric);

  return (
    <Page>
      <DetailTopBar title={c.kind === 'OFFICIAL' ? 'официальный канал' : 'локальный канал'} left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} right={<Round icon={Settings2} />} />
      <DeepCard style={{ borderRadius: 22, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <Mark text={mark} official size={48} />
          <View style={{ flex: 1 }}>
            <Text style={[fontDisplay, { fontSize: 20, letterSpacing: -0.7, color: colors.white }]}>{c.name}</Text>
            <Text style={[fontFamily, { fontSize: 9, color: whiteAlpha(65) }]}>{c.members} участников · {c.posts} публикаций{c.city ? ` · ${c.city}` : ''}</Text>
          </View>
          <Pressable onPress={() => (me.data ? join.mutate() : router.push('/onboarding'))} style={{ backgroundColor: c.joined ? whiteAlpha(15) : colors.lime, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}><T size={9} color={c.joined ? colors.white : colors.onLime}>{c.joined ? 'вы участник' : 'вступить'}</T></Pressable>
        </View>
        {c.owner && <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}><Text style={[fontFamily, { fontSize: 8, color: whiteAlpha(60) }]}>владелец: {c.owner}</Text><Text style={[fontFamily, { fontSize: 8, color: whiteAlpha(60) }]}>{c.admins} администратора</Text></View>}
      </DeepCard>
      <Segmented items={[{ value: 'feed', label: 'лента' }, { value: 'rubrics', label: 'рубрики' }, { value: 'about', label: 'о канале' }]} value={tab} onChange={setTab} />

      {tab === 'feed' && (
        <View style={{ gap: 10 }}>
          {c.kind === 'LOCAL' && (
            <Pressable onPress={() => router.push({ pathname: '/community/create', params: { kind: 'post', channelId: id } })}>
              <Surface radius={15} style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }}><Avatar name={me.data?.profile?.displayName ?? 'ВЫ'} size={30} lime /><T size={10} muted style={{ flex: 1 }}>написать пост или задать вопрос…</T><SquarePen size={14} color={colors.muted} /></Surface>
            </Pressable>
          )}
          {rubric && <Pressable onPress={() => setRubric(null)}><T size={9} color={colors.green}>рубрика «{rubric}» · показать все</T></Pressable>}
          {list.length === 0 && <Surface><T size={10} muted>{posts.isLoading ? 'Загрузка…' : 'Публикаций пока нет — напишите первым'}</T></Surface>}
          {list.map((p) => <PostCard key={p.id} post={p} onOpen={() => router.push({ pathname: '/community/topic/[id]', params: { id: p.id } })} />)}
        </View>
      )}
      {tab === 'rubrics' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {c.rubrics.map((r) => { const Icon = RUBRIC_ICON[r.name] ?? MessagesSquare; return (
            <Pressable key={r.id} onPress={() => { setRubric(r.name); setTab('feed'); }} style={{ width: '31%' }}>
              <Surface radius={14} style={{ padding: 11, gap: 6 }}><Icon size={16} color={colors.green} strokeWidth={1.6} /><T size={10} weight="500">{r.name}</T><T size={8} muted>{r.posts} {r.posts === 1 ? 'тема' : r.posts < 5 ? 'темы' : 'тем'}</T></Surface>
            </Pressable>
          ); })}
        </View>
      )}
      {tab === 'about' && <Surface radius={16}><T size={11} style={{ lineHeight: 16 }}>{c.description ?? 'Описание не заполнено'}</T><T size={9} muted style={{ marginTop: 8 }}>Жалобы и модерация — по правилам лиги. Поддержка может выдать или отозвать роль владельца.</T></Surface>}
    </Page>
  );
}
