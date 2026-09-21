import { router } from 'expo-router';
import { ArrowLeft, Search, SquarePen } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Avatar, DetailTopBar, FilterRow, fontFamily, Page, PageTitle, Round, Surface, T } from '../../src/components/ui';
import { Mark } from '../../src/features/community/components';
import { DIALOGS } from '../../src/features/community/mock';
import { goBack } from '../../src/navigation';
import { useTheme } from '../../src/theme/useTheme';

/** messages-view прототипа: чаты — личные и каналы. */
export default function MessagesScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'private' | 'channels'>('all');
  const [q, setQ] = useState('');
  const rows = DIALOGS.filter((d) => (filter === 'all' || (filter === 'private') === (d.mark.length === 2 && /[А-Я]/.test(d.mark) && !d.name.includes('·') && !d.name.includes('Club'))) && d.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Page>
      <DetailTopBar title="сообщения" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} right={<Round icon={SquarePen} />} />
      <PageTitle title="чаты" subtitle="личные сообщения и каналы" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 12, marginBottom: 12 }}>
        <Search size={14} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="найти диалог" placeholderTextColor={colors.muted} style={[fontFamily, { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 12 }]} />
      </View>
      <FilterRow items={[{ value: 'all' as const, label: 'все' }, { value: 'private' as const, label: 'личные' }, { value: 'channels' as const, label: 'каналы' }]} value={filter} onChange={setFilter} />
      <View style={{ gap: 7 }}>
        {rows.map((d) => (
          <Pressable key={d.id} onPress={() => router.push({ pathname: '/community/dialog/[id]', params: { id: d.id } })}>
            <Surface radius={15} style={{ padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View>{d.mark.length === 2 && /^[A-Z]/.test(d.mark) ? <Mark text={d.mark} /> : <Avatar name={d.name} size={38} />}{d.online && <View style={{ position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.surface }} />}</View>
              <View style={{ flex: 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T size={11} weight="500">{d.name}</T><T size={8} muted>{d.time}</T></View><T size={9} muted numberOfLines={1}>{d.last}</T></View>
              {d.unread ? <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><T size={8} weight="500" color={colors.onLime}>{d.unread}</T></View> : null}
            </Surface>
          </Pressable>
        ))}
      </View>
    </Page>
  );
}
