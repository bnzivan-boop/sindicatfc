import { Bookmark, Ellipsis, Heart, MessageCircle, Radio, Shield, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Avatar, fontFamily, Surface, T } from '../../components/ui';
import { useTheme } from '../../theme/useTheme';
import { router } from 'expo-router';
import { useMe } from '../../auth/useAuth';
import { ago, useLikePost, type PostRow } from './useCommunity';

/** .post из прототипа: автор, source-chip (канал · рубрика), заголовок, текст, действия. Данные — API. */
export function PostCard({ post, onOpen }: { post: PostRow; onOpen: () => void }) {
  const { colors } = useTheme();
  const me = useMe();
  const like = useLikePost();
  const SourceIcon: LucideIcon = post.channel.kind === 'OFFICIAL' ? Shield : Radio;
  const openAuthor = () => router.push(post.author.id === me.data?.id ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: post.author.id } });
  return (
    <Surface radius={18} style={{ padding: 13, gap: 9 }}>
      <Pressable onPress={openAuthor} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <Avatar name={post.author.displayName} size={34} />
        <View style={{ flex: 1 }}>
          <T size={11} weight="500">{post.author.displayName}</T>
          <T size={9} muted>{[ago(post.createdAt), post.author.city].filter(Boolean).join(' · ')}</T>
        </View>
        <Ellipsis size={16} color={colors.muted} />
      </Pressable>
      <Pressable onPress={() => router.push({ pathname: '/community/channel/[id]', params: { id: post.channel.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
        <SourceIcon size={10} color={colors.green} />
        <T size={9}>{post.channel.name}{post.rubric ? ` · ${post.rubric}` : ''}</T>
      </Pressable>
      <Pressable onPress={onOpen}>
        <Text style={[fontFamily, { fontSize: 14, fontWeight: '500', letterSpacing: -0.3, color: colors.text, marginBottom: 4 }]}>{post.title}</Text>
        <T size={11} style={{ lineHeight: 16 }} numberOfLines={4}>{post.text}</T>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action icon={Heart} label={String(post.likes)} active={post.likedByMe} onPress={() => (me.data ? like.mutate(post.id) : router.push('/onboarding'))} />
        <Action icon={MessageCircle} label={String(post.comments)} onPress={onOpen} />
        <Action icon={Bookmark} />
      </View>
    </Surface>
  );
}

function Action({ icon: Icon, label, active, onPress }: { icon: LucideIcon; label?: string; active?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: active ? `${colors.green}1f` : colors.surface2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Icon size={13} color={active ? colors.green : colors.text} strokeWidth={1.6} fill={active ? colors.green : 'transparent'} />
      {label ? <T size={10} color={active ? colors.green : colors.text}>{label}</T> : null}
    </Pressable>
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
      <Text style={[fontFamily, { fontSize: size * 0.28, fontWeight: '500', color: official ? colors.onLime : colors.text }]}>{text}</Text>
    </View>
  );
}
