import { router } from 'expo-router';
import { type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import HeartIcon from '../../../assets/figma/heart.svg';
import MessageIcon from '../../../assets/figma/message-feed.svg';
import { agoWords } from '../../api/helpers';
import { useMe } from '../../auth/useAuth';
import { Body, useFigmaSurfaces } from '../../components/figma/ui';
import { Avatar, fontSemi, Surface, T } from '../../components/ui';
import { figma } from '../../theme/figma';
import { useTheme } from '../../theme/useTheme';
import { useLikePost, type PostRow } from './useCommunity';

/** Публикация в ленте по макету Figma «Болталка»: автор, канал плашкой, заголовок, текст; лайки/комментарии — чипами как у трофея. */
export function PostCard({ post, onOpen }: { post: PostRow; onOpen: () => void }) {
  const s = useFigmaSurfaces();
  const me = useMe();
  const like = useLikePost();
  const openAuthor = () => router.push(post.author.id === me.data?.id ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: post.author.id } });
  return (
    <View style={{ backgroundColor: s.postCard, borderRadius: 20, padding: 20, gap: 11 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Pressable onPress={openAuthor} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Avatar name={post.author.displayName} size={40} radius={10} />
          <View style={{ gap: 4, flex: 1 }}>
            <Body size={20} weight="semibold" color={s.text} numberOfLines={1}>{post.author.displayName}</Body>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <Body size={8} weight="medium" tracking={-0.08} color={s.text40}>{agoWords(post.createdAt)}</Body>
              {post.author.city ? <Body size={8} weight="medium" tracking={-0.08} color={s.text40}>{post.author.city}</Body> : null}
            </View>
          </View>
        </Pressable>
        <Body size={8} weight="medium" tracking={-0.08} color={s.text40}>{post.channel.kind === 'OFFICIAL' ? 'Официальный' : 'Публикация'}</Body>
      </View>
      <Pressable onPress={() => router.push({ pathname: '/community/channel/[id]', params: { id: post.channel.id } })} style={{ alignSelf: 'flex-start', backgroundColor: s.label, paddingHorizontal: 6, paddingVertical: 3 }}>
        <Body size={11} lineHeight={14} weight="semibold" color={s.text}>{post.channel.name}{post.rubric ? ` ${post.rubric}` : ''}</Body>
      </Pressable>
      <Pressable onPress={onOpen} style={{ gap: 6 }}>
        <Body size={14} lineHeight={14} weight="semibold" color={s.text}>{post.title}</Body>
        <Body size={14} lineHeight={21} tracking={-0.14} color={s.text} numberOfLines={6}>{post.text}</Body>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable onPress={() => (me.data ? like.mutate(post.id) : router.push('/onboarding'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: post.likedByMe ? figma.lime : s.chip, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 4 }}>
          <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}><HeartIcon width={14} height={12} color={post.likedByMe ? '#000000' : s.text} /></View>
          <Body size={14} lineHeight={14} weight="semibold" color={post.likedByMe ? '#000000' : s.text}>{String(post.likes)}</Body>
        </Pressable>
        <Pressable onPress={onOpen} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: s.chip, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 4 }}>
          <MessageIcon width={14} height={14} color={s.text} />
          <Body size={14} lineHeight={14} weight="semibold" color={s.text}>{String(post.comments)}</Body>
        </Pressable>
      </View>
    </View>
  );
}

/** .create-channel — кнопка «создать …» со стрелкой. */
export function CreateRow({ icon: Icon, title, sub, onPress }: { icon: LucideIcon; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Surface radius={16} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderStyle: 'dashed' }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={colors.onLime} strokeWidth={1.8} /></View>
        <View style={{ flex: 1 }}><T size={11} weight="500">{title}</T><T size={9} muted>{sub}</T></View>
        <T size={12} muted>›</T>
      </Surface>
    </Pressable>
  );
}

/** .community-tabs / .channel-nav — сегментный переключатель. */
export function Segmented<T extends string>({ items, value, onChange }: { items: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 3, backgroundColor: colors.surface2, borderRadius: 12, padding: 3, marginBottom: 13 }}>
      {items.map((it) => (
        <Pressable key={it.value} onPress={() => onChange(it.value)} style={{ flex: 1, borderRadius: 9, paddingVertical: 8, alignItems: 'center', backgroundColor: it.value === value ? colors.surface : 'transparent' }}>
          <T size={10} color={it.value === value ? colors.text : colors.muted}>{it.label}</T>
        </Pressable>
      ))}
    </View>
  );
}

/** Метка-бейдж канала/клуба (.channel-mark / .club-badge). */
export function Mark({ text, official, size = 38 }: { text: string; official?: boolean; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: official ? colors.lime : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[fontSemi, { fontSize: size * 0.28, color: official ? colors.onLime : colors.text }]}>{text}</Text>
    </View>
  );
}
