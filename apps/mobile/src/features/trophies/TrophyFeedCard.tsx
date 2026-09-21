import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Award, Fish, Heart, MessageCircle } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useMe } from '../../auth/useAuth';
import { Avatar, fontFamily, Surface, T } from '../../components/ui';
import { useTheme } from '../../theme/useTheme';
import { fmtFish, type FeedItem } from './useTrophies';

const ago = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000); return m < 60 ? `${m} мин назад` : m < 1440 ? `${Math.round(m / 60)} ч назад` : `${Math.round(m / 1440)} дн назад`; };

/** Трофей в ленте сообщества (.post с фото улова). Реальные данные из /feed/trophies. */
export function TrophyFeedCard({ item }: { item: FeedItem }) {
  const { colors } = useTheme();
  const me = useMe();
  const qc = useQueryClient();
  const like = useMutation({
    mutationFn: () => api<{ liked: boolean; likes: number }>(`/trophies/${item.id}/like`, { method: 'POST', body: {} }),
    onSuccess: (r) => qc.setQueriesData<{ items: FeedItem[]; nextCursor: string | null }>({ queryKey: ['feed-trophies'] }, (d) => (d ? { ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, likes: r.likes, likedByMe: r.liked } : i)) } : d)),
  });
  const open = () => router.push({ pathname: '/trophy/[id]', params: { id: item.id } });
  return (
    <Surface radius={18} style={{ padding: 13, gap: 9 }}>
      <Pressable onPress={() => router.push(item.owner.id === me.data?.id ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: item.owner.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <Avatar name={item.owner.displayName} size={34} />
        <View style={{ flex: 1 }}><T size={11} weight="500">{item.owner.displayName}</T><T size={9} muted>{[ago(item.publishedAt), item.owner.city].filter(Boolean).join(' · ')}</T></View>
        {item.isPersonalRecord && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.lime, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 }}><Award size={10} color={colors.onLime} /><T size={8} color={colors.onLime}>рекорд</T></View>}
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}><Fish size={10} color={colors.green} /><T size={9}>трофей{item.waterbody ? ` · ${item.waterbody}` : ''}</T></View>
      <Pressable onPress={open}>
        <Text style={[fontFamily, { fontSize: 14, fontWeight: '500', letterSpacing: -0.3, color: colors.text, marginBottom: 4 }]}>{item.species}{fmtFish(item.lengthMm, item.weightG) ? ` · ${fmtFish(item.lengthMm, item.weightG)}` : ''}</Text>
        {item.description ? <T size={11} style={{ lineHeight: 16 }} numberOfLines={3}>{item.description}</T> : null}
      </Pressable>
      <Pressable onPress={open}>
        {item.photo ? <Image source={{ uri: item.photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: colors.surface2 }} resizeMode="cover" /> : <View style={{ height: 120, borderRadius: 14, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center' }}><Fish size={28} color={colors.lime} strokeWidth={1.3} /></View>}
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => (me.data ? like.mutate() : router.push('/onboarding'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: item.likedByMe ? `${colors.green}1f` : colors.surface2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Heart size={13} color={item.likedByMe ? colors.green : colors.text} fill={item.likedByMe ? colors.green : 'transparent'} strokeWidth={1.6} /><T size={10} color={item.likedByMe ? colors.green : colors.text}>{item.likes}</T>
        </Pressable>
        <Pressable onPress={open} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}><MessageCircle size={13} color={colors.text} strokeWidth={1.6} /><T size={10}>{item.comments}</T></Pressable>
      </View>
    </Surface>
  );
}
