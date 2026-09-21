import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Fish as FishFallback } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';
import FishIcon from '../../../assets/figma/fish.svg';
import HeartIcon from '../../../assets/figma/heart.svg';
import MessageIcon from '../../../assets/figma/message-feed.svg';
import RulerIcon from '../../../assets/figma/ruler.svg';
import ScaleIcon from '../../../assets/figma/scale.svg';
import { api } from '../../api/client';
import { agoWords } from '../../api/helpers';
import { useMe } from '../../auth/useAuth';
import { Body, Display, LimeChip, useFigmaSurfaces } from '../../components/figma/ui';
import { Avatar } from '../../components/ui';
import { figma } from '../../theme/figma';
import type { FeedItem } from './useTrophies';

const fmtLen = (mm: number) => `${(mm / 10).toLocaleString('ru-RU')} см`;
const fmtWeight = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг` : `${g} г`);

/** Трофей в ленте по макету Figma «Карточка трофея». Данные — /feed/trophies. */
export function TrophyFeedCard({ item }: { item: FeedItem }) {
  const s = useFigmaSurfaces();
  const me = useMe();
  const qc = useQueryClient();
  const like = useMutation({
    mutationFn: () => api<{ liked: boolean; likes: number }>(`/trophies/${item.id}/like`, { method: 'POST', body: {} }),
    onSuccess: (r) => qc.setQueriesData<{ items: FeedItem[]; nextCursor: string | null }>({ queryKey: ['feed-trophies'] }, (d) => (d ? { ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, likes: r.likes, likedByMe: r.liked } : i)) } : d)),
  });
  const open = () => router.push({ pathname: '/trophy/[id]', params: { id: item.id } });
  return (
    <View style={{ backgroundColor: s.feedCard, borderRadius: 20, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.push(item.owner.id === me.data?.id ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: item.owner.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {/* Фото автора в ленте API не отдаёт — инициалы на подложке 50×50 r10, как плейсхолдер макета */}
          <Avatar name={item.owner.displayName} size={50} radius={10} />
          <View style={{ gap: 4, flex: 1 }}>
            <Display size={24} lineHeight={24} color={s.text} numberOfLines={1}>{item.owner.displayName}</Display>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <Body size={8} weight="medium" tracking={-0.08} color={s.text40}>{agoWords(item.publishedAt)}</Body>
              {item.owner.city ? <Body size={8} weight="medium" tracking={-0.08} color={s.text40}>{item.owner.city}</Body> : null}
            </View>
          </View>
        </Pressable>
        <LimeChip radius={20} size={10} paddingH={4} paddingV={2}>{item.isPersonalRecord ? 'Рекорд' : 'Трофей'}</LimeChip>
      </View>
      <Pressable onPress={open} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Stat icon={<FishIcon width={10} height={10} color={figma.chipIcon} />} value={item.species} color={s.text} />
          {item.lengthMm ? <Stat icon={<RulerIcon width={12} height={12} color={figma.chipIcon} />} value={fmtLen(item.lengthMm)} color={s.text} /> : null}
          {item.weightG ? <Stat icon={<ScaleIcon width={11} height={12} color={figma.chipIcon} />} value={fmtWeight(item.weightG)} color={s.text} /> : null}
        </View>
        {item.description ? <Body size={12} lineHeight={14} color={s.text}>{item.description}</Body> : null}
      </Pressable>
      <Pressable onPress={open}>
        {item.photo
          ? <Image source={{ uri: item.photo }} style={{ width: '100%', height: 300, borderRadius: 20, backgroundColor: s.photoPlaceholder }} resizeMode="cover" />
          : <View style={{ height: 300, borderRadius: 20, backgroundColor: s.photoPlaceholder, alignItems: 'center', justifyContent: 'center' }}><FishFallback size={28} color={figma.lime} strokeWidth={1.3} /></View>}
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable onPress={() => (me.data ? like.mutate() : router.push('/onboarding'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: item.likedByMe ? figma.lime : s.chip, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 4 }}>
          <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}><HeartIcon width={14} height={12} color={item.likedByMe ? '#000000' : s.text} /></View>
          <Body size={14} lineHeight={14} weight="semibold" color={item.likedByMe ? '#000000' : s.text}>{String(item.likes)}</Body>
        </Pressable>
        <Pressable onPress={open} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: s.chip, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 4 }}>
          <MessageIcon width={14} height={14} color={s.text} />
          <Body size={14} lineHeight={14} weight="semibold" color={s.text}>{String(item.comments)}</Body>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ icon, value, color }: { icon: React.ReactNode; value: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {icon}
      <Body size={14} lineHeight={14} weight="semibold" color={color}>{value}</Body>
    </View>
  );
}
