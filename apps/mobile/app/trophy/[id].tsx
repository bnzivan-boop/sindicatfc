import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Award, Fish, Heart, MapPin, MessageCircle, Send, Share2, Trash2, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMe } from '../../src/auth/useAuth';
import { Avatar, DetailTopBar, EventTag, fontFamily, InfoList, InfoRow, Page, Round, SectionHead, Surface, T } from '../../src/components/ui';
import { fmtFish, useCommentTrophy, useDeleteComment, useLikeTrophy, useTrophy } from '../../src/features/trophies/useTrophies';
import { goBack } from '../../src/navigation';
import { useTheme } from '../../src/theme/useTheme';

const W = Dimensions.get('window').width;

/** Карточка трофея: серия фото (свайп, тап — на весь экран), характеристики, лайк, комментарии. */
export default function TrophyScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { data: t } = useTrophy(id);
  const like = useLikeTrophy(id);
  const comment = useCommentTrophy(id);
  const del = useDeleteComment(id);
  const [page, setPage] = useState(0);
  const [full, setFull] = useState<number | null>(null);
  const [text, setText] = useState('');

  if (!t) return <Page><DetailTopBar title="трофей" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} /><T muted>Загрузка…</T></Page>;
  const photoW = W - 32;
  const send = () => { if (!text.trim()) return; comment.mutate(text.trim(), { onSuccess: () => setText('') }); };
  const ago = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000); return m < 60 ? `${m} мин` : m < 1440 ? `${Math.round(m / 60)} ч` : new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); };

  return (
    <Page contentStyle={{ paddingBottom: 40 }}>
      <DetailTopBar title="трофей" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} right={<Round icon={Share2} />} />

      {/* автор */}
      <Pressable onPress={() => router.push(t.owner.id === me.data?.id ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: t.owner.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <Avatar name={t.owner.displayName} size={36} />
        <View style={{ flex: 1 }}><T size={11} weight="500">{t.owner.displayName}</T><T size={9} muted>{[t.owner.city, new Date(t.caughtAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')}</T></View>
        {t.isPersonalRecord && <EventTag>личный рекорд</EventTag>}
      </Pressable>

      {/* галерея */}
      {t.photos.length > 0 ? (
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / photoW))} style={{ borderRadius: 20 }}>
            {t.photos.map((uri, i) => (
              <Pressable key={uri} onPress={() => setFull(i)}><Image source={{ uri }} style={{ width: photoW, aspectRatio: 4 / 3, backgroundColor: colors.surface2 }} resizeMode="cover" /></Pressable>
            ))}
          </ScrollView>
          {t.photos.length > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 }}>
              {t.photos.map((_, i) => <View key={i} style={{ width: i === page ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? colors.green : colors.line }} />)}
            </View>
          )}
        </View>
      ) : (
        <View style={{ aspectRatio: 4 / 3, borderRadius: 20, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center' }}><Fish size={40} color={colors.lime} strokeWidth={1.2} /><T size={9} color={colors.lime} style={{ marginTop: 8 }}>без фото</T></View>
      )}

      {/* заголовок + действия */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 }}>
        <View>
          <Text style={[fontFamily, { fontSize: 24, fontWeight: '500', letterSpacing: -0.9, color: colors.text }]}>{t.species}</Text>
          <Text style={[fontFamily, { fontSize: 13, color: colors.muted }]}>{fmtFish(t.lengthMm, t.weightG) || 'без замеров'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => (me.data ? like.mutate() : router.push('/onboarding'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.likedByMe ? `${colors.green}1f` : colors.surface2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Heart size={14} color={t.likedByMe ? colors.green : colors.text} fill={t.likedByMe ? colors.green : 'transparent'} strokeWidth={1.6} /><T size={11} color={t.likedByMe ? colors.green : colors.text}>{t.likes}</T>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}><MessageCircle size={14} color={colors.text} strokeWidth={1.6} /><T size={11}>{t.comments.length}</T></View>
        </View>
      </View>
      {t.description ? <T size={12} style={{ lineHeight: 18, marginTop: 10 }}>{t.description}</T> : null}

      <SectionHead title="характеристики" />
      <InfoList>
        <InfoRow icon={Fish} label="вид · длина · вес" value={`${t.species}${fmtFish(t.lengthMm, t.weightG) ? ` · ${fmtFish(t.lengthMm, t.weightG)}` : ''}`} />
        {t.gear && (t.gear.kitName || t.gear.freeText) && <InfoRow icon={Trophy} label="на что поймана" value={[t.gear.rod ?? t.gear.kitName, t.gear.freeText].filter(Boolean).join(' · ')} onPress={t.gear.kitId ? () => undefined : undefined} />}
        <InfoRow icon={MapPin} label="место" value={t.waterbody ?? (t.locationPrivacy === 'HIDDEN' ? 'скрыто владельцем' : 'водоём не указан')} />
        {t.tournament && <InfoRow icon={Award} label="турнир" value={t.tournament.title} onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: t.tournament!.id } })} />}
      </InfoList>

      <SectionHead title={`комментарии · ${t.comments.length}`} />
      <View style={{ gap: 8 }}>
        {t.comments.length === 0 && <Surface radius={14} style={{ padding: 11 }}><T size={10} muted>Пока никто не написал — будьте первым.</T></Surface>}
        {t.comments.map((c) => {
          const mine = c.authorId === me.data?.id;
          return (
            <View key={c.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Pressable onPress={() => router.push(mine ? '/(tabs)/profile' : { pathname: '/user/[id]', params: { id: c.authorId } })}><Avatar name={c.author} size={28} lime={mine} /></Pressable>
              <View style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 10, gap: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T size={10} weight="500">{mine ? 'Вы' : c.author}</T><T size={8} muted>{ago(c.createdAt)}</T></View>
                <T size={11} style={{ lineHeight: 16 }}>{c.text}</T>
                {(mine || t.owner.id === me.data?.id) && <Pressable onPress={() => del.mutate(c.id)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end' }}><Trash2 size={9} color={colors.muted} /><T size={8} muted>удалить</T></Pressable>}
              </View>
            </View>
          );
        })}
      </View>
      {me.data ? (
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder="написать комментарий…" placeholderTextColor={colors.muted} style={[fontFamily, { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, color: colors.text, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12 }]} />
          <Pressable onPress={send} disabled={comment.isPending} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}><Send size={16} color={colors.bg} strokeWidth={1.6} /></Pressable>
        </View>
      ) : (
        <Pressable onPress={() => router.push('/onboarding')} style={{ marginTop: 12 }}><T size={10} color={colors.green}>войдите, чтобы лайкать и комментировать</T></Pressable>
      )}

      {/* полноэкранный просмотр */}
      <Modal visible={full !== null} transparent animationType="fade" onRequestClose={() => setFull(null)}>
        <Pressable onPress={() => setFull(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: (full ?? 0) * W, y: 0 }}>
            {t.photos.map((uri) => <Image key={uri} source={{ uri }} style={{ width: W, height: '100%' }} resizeMode="contain" />)}
          </ScrollView>
          <View style={{ position: 'absolute', top: 50, right: 16 }}><Round icon={ArrowLeft} onPress={() => setFull(null)} /></View>
        </Pressable>
      </Modal>
    </Page>
  );
}
