import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Field } from '../../src/components/Field';
import { Picker } from '../../src/components/Picker';
import { DetailTopBar, LimeButton, Page, PageTitle, Round, Surface, T } from '../../src/components/ui';
import { DISCIPLINE_LABELS_RU, Discipline } from '@sindikat/domain';
import { useChannel, useChannels, useCreateChannel, useCreateClub, useCreatePost, useCreateTrip } from '../../src/features/community/useCommunity';
import { goBack } from '../../src/navigation';
import { useTheme } from '../../src/theme/useTheme';

type Kind = 'post' | 'channel' | 'trip' | 'club';

/** Формы create-* из прототипа. Пост и канал — настоящие; выезд и клуб — пока демо (модуль этапа 5). */
export default function CreateScreen() {
  const { colors } = useTheme();
  const { kind = 'post', channelId } = useLocalSearchParams<{ kind?: Kind; channelId?: string }>();
  const channels = useChannels();
  const [chId, setChId] = useState<string | undefined>(channelId);
  const channel = useChannel(chId ?? '');
  const createPost = useCreatePost(chId ?? '');
  const createChannel = useCreateChannel();
  const createTrip = useCreateTrip();
  const createClub = useCreateClub();
  const [disc, setDisc] = useState<Discipline>('STREET');
  const [recruiting, setRecruiting] = useState('open');
  const [v, setV] = useState<Record<string, string>>({});
  const [rubricId, setRubricId] = useState<string | undefined>();
  const set = (k: string) => (val: string) => setV({ ...v, [k]: val });
  const locals = (channels.data ?? []).filter((c) => c.kind === 'LOCAL');

  if (kind === 'post') {
    return (
      <Page>
        <DetailTopBar title="новая публикация" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} />
        <PageTitle title="новая публикация" subtitle={channel.data?.name ?? 'выберите канал'} />
        <View style={{ gap: 12 }}>
          {!channelId && <Picker label="канал" items={locals.map((c) => ({ value: c.id, label: c.name }))} value={chId} onChange={setChId} />}
          {channel.data && <Picker label="рубрика" items={channel.data.rubrics.map((r) => ({ value: r.id, label: r.name }))} value={rubricId} onChange={setRubricId} />}
          <Field label="заголовок" value={v['title'] ?? ''} onChangeText={set('title')} placeholder="Что работает на Москве-реке сегодня?" />
          <Field label="текст" value={v['text'] ?? ''} onChangeText={set('text')} multiline placeholder="Делитесь наблюдениями по уровню воды, активности рыбы и рабочим приманкам." style={{ minHeight: 110, textAlignVertical: 'top' }} />
          {createPost.isError && <T size={10} color={colors.orange}>{String(createPost.error)}</T>}
          <LimeButton title={createPost.isPending ? 'публикуем…' : 'опубликовать'} disabled={!chId || (v['title'] ?? '').trim().length < 3 || !(v['text'] ?? '').trim() || createPost.isPending} onPress={() => createPost.mutate({ title: v['title']!.trim(), text: v['text']!.trim(), rubricId }, { onSuccess: (p) => router.replace({ pathname: '/community/topic/[id]', params: { id: p.id } }) })} />
        </View>
      </Page>
    );
  }
  if (kind === 'channel') {
    return (
      <Page>
        <DetailTopBar title="новый канал" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} />
        <PageTitle title="новый канал" subtitle="вы станете владельцем; рубрики создадутся стандартные" />
        <View style={{ gap: 12 }}>
          <Field label="название канала" value={v['name'] ?? ''} onChangeText={set('name')} placeholder="Стрит Химки" />
          <Field label="город или район" value={v['city'] ?? ''} onChangeText={set('city')} placeholder="Химки, Московская область" />
          <Field label="тематика" value={v['description'] ?? ''} onChangeText={set('description')} placeholder="Береговой спиннинг" />
          {createChannel.isError && <T size={10} color={colors.orange}>{String(createChannel.error)}</T>}
          <LimeButton title={createChannel.isPending ? 'создаём…' : 'создать канал'} disabled={(v['name'] ?? '').trim().length < 3 || createChannel.isPending} onPress={() => createChannel.mutate({ name: v['name']!.trim(), city: v['city']?.trim() || undefined, description: v['description']?.trim() || undefined }, { onSuccess: (c) => router.replace({ pathname: '/community/channel/[id]', params: { id: c.id } }) })} />
        </View>
      </Page>
    );
  }
  if (kind === 'trip') {
    const toIso = (dateStr: string, timeStr: string) => { const [d, m, y] = dateStr.split('.').map(Number); const [hh, mm] = timeStr.split(':').map(Number); return new Date(y ?? new Date().getFullYear(), (m ?? 1) - 1, d ?? 1, hh ?? 8, mm ?? 0).toISOString(); };
    const valid = (v['title'] ?? '').trim().length >= 3 && (v['place'] ?? '').trim().length >= 2 && /^\d{1,2}\.\d{1,2}(\.\d{4})?$/.test(v['date'] ?? '') && /^\d{1,2}:\d{2}$/.test(v['time'] ?? '');
    return (
      <Page>
        <DetailTopBar title="совместный выезд" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} />
        <PageTitle title="совместный выезд" subtitle="найдите компанию на рыбалку" />
        <View style={{ gap: 12 }}>
          <Field label="что делаем" value={v['title'] ?? ''} onChangeText={set('title')} placeholder="вечерний микроджиг на Москве-реке" />
          <Field label="куда едем" value={v['place'] ?? ''} onChangeText={set('place')} placeholder="Нескучный сад" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="дата (дд.мм)" value={v['date'] ?? ''} onChangeText={set('date')} placeholder="21.09" /></View>
            <View style={{ flex: 1 }}><Field label="время" value={v['time'] ?? ''} onChangeText={set('time')} placeholder="19:00" /></View>
            <View style={{ flex: 1 }}><Field label="мест" value={v['seats'] ?? '2'} onChangeText={set('seats')} keyboardType="number-pad" /></View>
          </View>
          <Field label="детали" value={v['details'] ?? ''} onChangeText={set('details')} multiline placeholder="Спокойный темп, новички тоже велкам. Встречаемся у главного входа." style={{ minHeight: 80, textAlignVertical: 'top' }} />
          {createTrip.isError && <T size={10} color={colors.orange}>{String(createTrip.error)}</T>}
          <LimeButton title={createTrip.isPending ? 'создаём…' : 'создать выезд'} disabled={!valid || createTrip.isPending} onPress={() => createTrip.mutate({ title: v['title']!.trim(), place: v['place']!.trim(), startsAt: toIso(v['date']!, v['time']!), seats: Number(v['seats'] ?? 2) || 2, details: v['details']?.trim() || undefined }, { onSuccess: () => router.replace('/(tabs)/community') })} />
        </View>
      </Page>
    );
  }
  return (
    <Page>
      <DetailTopBar title="новый клуб" left={<Round icon={ArrowLeft} onPress={() => goBack('/(tabs)/community')} />} />
      <PageTitle title="новый клуб" subtitle="вы станете капитаном и владельцем" />
      <View style={{ gap: 12 }}>
        <Field label="название клуба" value={v['name'] ?? ''} onChangeText={set('name')} placeholder="Moscow Pike Crew" />
        <Picker label="основная дисциплина" items={Object.values(Discipline).map((d) => ({ value: d, label: DISCIPLINE_LABELS_RU[d].toLowerCase() }))} value={disc} onChange={setDisc} />
        <Field label="город или регион" value={v['city'] ?? ''} onChangeText={set('city')} placeholder="Москва и область" />
        <Picker label="набор" items={[{ value: 'open', label: 'открытый набор' }, { value: 'invite', label: 'по приглашению' }]} value={recruiting} onChange={setRecruiting} />
        <Field label="о клубе" value={v['description'] ?? ''} onChangeText={set('description')} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <Surface radius={14} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}><T size={10} weight="500" color={colors.onLime}>{(v['name'] ?? 'МК').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'МК'}</T></View><View><T size={11} weight="500">{v['name'] || 'Название клуба'}</T><T size={9} muted>{[v['city'] || 'город', DISCIPLINE_LABELS_RU[disc].toLowerCase(), recruiting === 'open' ? 'открыт набор' : 'по приглашению'].join(' · ')}</T></View></Surface>
        {createClub.isError && <T size={10} color={colors.orange}>{String(createClub.error)}</T>}
        <LimeButton title={createClub.isPending ? 'создаём…' : 'создать клуб'} disabled={(v['name'] ?? '').trim().length < 3 || createClub.isPending} onPress={() => createClub.mutate({ name: v['name']!.trim(), city: v['city']?.trim() || undefined, discipline: disc, recruiting: recruiting === 'open', description: v['description']?.trim() || undefined }, { onSuccess: (c) => router.replace({ pathname: '/community/club/[id]', params: { id: c.id } }) })} />
      </View>
    </Page>
  );
}
