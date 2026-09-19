import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bell, Heart, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useMe } from '../../../src/auth/useAuth';
import { Avatar, DetailTopBar, fontFamily, Page, Round, SectionHead, Surface, T } from '../../../src/components/ui';
import { ago, useCommentPost, useLikePost, usePost } from '../../../src/features/community/useCommunity';
import { goBack } from '../../../src/navigation';
import { useTheme } from '../../../src/theme/useTheme';

/** topic-view прототипа: исходный пост, лайк, ответы, поле ответа — на реальных данных. */
export default function TopicScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { data: post } = usePost(id);
  const like = useLikePost();
  const comment = useCommentPost(id);
  const [text, setText] = useState('');
  if (!post) return <Page><DetailTopBar title="обсуждение" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} /><T muted>Загрузка…</T></Page>;
  const send = () => { if (!text.trim()) return; comment.mutate(text.trim(), { onSuccess: () => setText('') }); };
  const n = post.comments.length;

  return (
    <Page>
      <DetailTopBar title={`обсуждение · ${post.rubric ?? post.channel.name}`} left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} right={<Round icon={Bell} />} />
      <Surface radius={18} style={{ gap: 8 }}>
        <Pressable onPress={() => router.push(post.author.id === me.data?.id ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: post.author.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Avatar name={post.author.displayName} size={34} /><View><T size={11} weight="500">{post.author.displayName}</T><T size={9} muted>{post.channel.name} · {ago(post.createdAt)}</T></View></Pressable>
        <Text style={[fontFamily, { fontSize: 16, fontWeight: '500', letterSpacing: -0.4, color: colors.text }]}>{post.title}</Text>
        <T size={11} style={{ lineHeight: 16 }}>{post.text}</T>
        <Pressable onPress={() => (me.data ? like.mutate(post.id) : router.push('/onboarding'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: post.likedByMe ? `${colors.green}1f` : colors.surface2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Heart size={13} color={post.likedByMe ? colors.green : colors.text} fill={post.likedByMe ? colors.green : 'transparent'} strokeWidth={1.6} /><T size={10} color={post.likedByMe ? colors.green : colors.text}>{post.likes}</T>
        </Pressable>
      </Surface>
      <SectionHead title={`${n} ${n === 1 ? 'ответ' : n > 1 && n < 5 ? 'ответа' : 'ответов'}`} />
      <View style={{ gap: 8 }}>
        {n === 0 && <Surface radius={14} style={{ padding: 11 }}><T size={10} muted>Ответов пока нет.</T></Surface>}
        {post.comments.map((r) => {
          const mine = r.authorId === me.data?.id;
          return (
            <View key={r.id} style={{ flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
              <Pressable onPress={() => router.push(mine ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: r.authorId } })}><Avatar name={mine ? 'ВЫ' : r.author} size={28} lime={mine} /></Pressable>
              <View style={{ maxWidth: '80%', backgroundColor: mine ? colors.deep : colors.surface, borderWidth: mine ? 0 : 1, borderColor: colors.line, borderRadius: 14, padding: 10, gap: 3 }}>
                <T size={10} weight="500" color={mine ? colors.white : colors.text}>{mine ? 'Вы' : r.author}</T>
                <T size={10} color={mine ? colors.white : colors.text} style={{ lineHeight: 15 }}>{r.text}</T>
                <T size={8} color={mine ? colors.lime : colors.muted}>{ago(r.createdAt)}</T>
              </View>
            </View>
          );
        })}
      </View>
      {me.data ? (
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 14 }}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder="ответить в теме…" placeholderTextColor={colors.muted} style={[fontFamily, { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, color: colors.text, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12 }]} />
          <Pressable onPress={send} disabled={comment.isPending} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}><Send size={16} color={colors.bg} strokeWidth={1.6} /></Pressable>
        </View>
      ) : <Pressable onPress={() => router.push('/onboarding')} style={{ marginTop: 12 }}><T size={10} color={colors.green}>войдите, чтобы отвечать</T></Pressable>}
    </Page>
  );
}
