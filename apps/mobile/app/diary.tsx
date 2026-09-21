import { goBack } from '../src/navigation';
import { router } from 'expo-router';
import { ArrowLeft, Award, Fish, Heart, MessageCircle, Plus, Trash2 } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';
import { DetailTopBar, EventTag, fontSemi, Page, PageTitle, Round, Surface, T } from '../src/components/ui';
import { useCatches, useDeleteCatch, usePromoteTrophy } from '../src/features/catches/useCatches';
import { useTheme } from '../src/theme/useTheme';

/** diary-view прототипа: записи дневника; любую можно повысить до трофея (единая сущность catch, handoff §6.3). */
export default function DiaryScreen() {
  const { colors } = useTheme();
  const { data, isLoading } = useCatches();
  const promote = usePromoteTrophy();
  const del = useDeleteCatch();
  const rows = data ?? [];
  const trophies = rows.filter((c) => c.trophy);

  return (
    <Page>
      <DetailTopBar title="дневник" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} right={<Round icon={Plus} onPress={() => router.push('/catch/new')} />} />
      <PageTitle title="дневник" subtitle={`${rows.length} записей · ${trophies.length} трофеев в ленте`} />
      {rows.length === 0 && (
        <Surface><T size={11} muted>{isLoading ? 'Загрузка…' : 'Пока пусто. Добавьте улов: вид, длина, вес, на что поймана, место.'}</T></Surface>
      )}
      <View style={{ gap: 8 }}>
        {rows.map((c) => (
          <Pressable key={c.id} disabled={!c.trophy} onPress={() => router.push({ pathname: '/trophy/[id]', params: { id: c.id } })}>
          <Surface radius={17} style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
            {c.photoUrls?.[0] ? (
              <Image source={{ uri: c.photoUrls[0] }} style={{ width: 56, height: 56, borderRadius: 13 }} />
            ) : (
              <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.trophy ? colors.lime : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                {c.trophy ? <Award size={18} color={colors.onLime} strokeWidth={1.6} /> : <Fish size={18} color={colors.green} strokeWidth={1.6} />}
              </View>
            )}
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[fontSemi, { fontSize: 13, color: colors.text }]}>
                  {c.species.nameRu}{c.lengthMm ? ` · ${c.lengthMm / 10} см` : ''}{c.weightG ? ` · ${c.weightG >= 1000 ? `${(c.weightG / 1000).toFixed(2)} кг` : `${c.weightG} г`}` : ''}
                </Text>
                {c.trophy?.isPersonalRecord && <EventTag>рекорд</EventTag>}
              </View>
              <T size={9} muted>{new Date(c.caughtAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}{c.location ? ` · гео: ${{ EXACT: 'точка', WATERBODY_ONLY: 'водоём', HIDDEN: 'скрыто' }[c.location.privacy]}` : ''}</T>
              {c.description ? <T size={10}>{c.description}</T> : null}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                {!c.trophy ? <Pressable onPress={() => promote.mutate(c.id)} hitSlop={6}><T size={9} color={colors.green}>опубликовать как трофей</T></Pressable> : (
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Heart size={10} color={colors.green} fill={c._count.likes ? colors.green : 'transparent'} strokeWidth={1.6} /><T size={9}>{c._count.likes}</T></View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><MessageCircle size={10} color={colors.text} strokeWidth={1.6} /><T size={9}>{c._count.comments}</T></View>
                    <T size={9} color={colors.green}>в ленте</T>
                  </View>
                )}
                <Pressable onPress={() => del.mutate(c.id)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Trash2 size={10} color={colors.muted} /><T size={9} muted>удалить</T></Pressable>
              </View>
            </View>
          </Surface>
          </Pressable>
        ))}
      </View>
    </Page>
  );
}
