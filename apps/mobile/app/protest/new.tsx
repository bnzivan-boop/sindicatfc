import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../src/api/client';
import { useLeaderboard, useTournament } from '../../src/api/tournaments';
import { Field } from '../../src/components/Field';
import { Picker } from '../../src/components/Picker';
import { DetailTopBar, LimeButton, Page, PageTitle, Round, SectionHead, Surface, T } from '../../src/components/ui';
import { useMyResults } from '../../src/features/results/useResults';
import { goBack } from '../../src/navigation';
import { useTheme } from '../../src/theme/useTheme';

interface Protest { id: string; status: string; targetType: string; text: string; resolution: string | null; createdAt: string; deadlineAt: string }
const STATUS: Record<string, string> = { OPEN: 'на рассмотрении', UNDER_REVIEW: 'рассматривается', UPHELD: 'удовлетворён', DISMISSED: 'отклонён', WITHDRAWN: 'отозван' };

/** protest-sheet прототипа: цель (мой результат / лидерборд), текст, дедлайн; ниже — мои протесты. */
export default function NewProtestScreen() {
  const { colors } = useTheme();
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const { data: t } = useTournament(tournamentId);
  const mine = useMyResults(tournamentId);
  const lb = useLeaderboard(tournamentId);
  const qc = useQueryClient();
  const protests = useQuery({ queryKey: ['my-protests', tournamentId], queryFn: () => api<Protest[]>(`/tournaments/${tournamentId}/protests/mine`) });
  const [targetType, setTargetType] = useState<'RESULT' | 'LEADERBOARD'>('RESULT');
  const [targetId, setTargetId] = useState<string>();
  const [text, setText] = useState('');

  const send = useMutation({
    mutationFn: () => api(`/tournaments/${tournamentId}/protests`, { method: 'POST', body: { targetType, targetId: targetType === 'RESULT' ? targetId : tournamentId, text } }),
    onSuccess: () => { setText(''); void qc.invalidateQueries({ queryKey: ['my-protests', tournamentId] }); },
  });

  const deadline = t ? new Date(new Date(t.endsAt).getTime() + t.protestDeadlineMinutes * 60_000) : null;
  const closed = deadline ? deadline < new Date() : false;
  const results = (mine.data ?? []).filter((r) => ['ACCEPTED', 'REJECTED', 'CORRECTED', 'NEEDS_RESUBMISSION'].includes(r.status));

  return (
    <Page>
      <DetailTopBar title="протест" left={<Round icon={ArrowLeft} onPress={() => goBack({ pathname: '/live/[id]', params: { id: tournamentId } })} />} />
      <PageTitle title="подать протест" subtitle={deadline ? `до ${deadline.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · ${t?.protestDeadlineMinutes} мин после финиша` : '…'} />
      <View style={{ gap: 12 }}>
        <Picker label="что оспариваете" items={[{ value: 'RESULT' as const, label: 'решение по моему результату' }, { value: 'LEADERBOARD' as const, label: 'live-рейтинг' }]} value={targetType} onChange={setTargetType} />
        {targetType === 'RESULT' && (
          <Picker label="результат" items={results.map((r) => ({ value: r.id, label: `${r.species.nameRu} ${r.lengthMm ? `${r.lengthMm / 10} см` : ''} · ${r.status === 'ACCEPTED' ? 'засчитан' : r.status === 'REJECTED' ? 'отклонён' : r.status.toLowerCase()}` }))} value={targetId} onChange={setTargetId} />
        )}
        {targetType === 'RESULT' && results.length === 0 && <T size={9} muted>У вас пока нет результатов с решением судьи.</T>}
        <Field label="суть протеста" value={text} onChangeText={setText} multiline placeholder="например: длина на фото 33 см, судья засчитал 31" style={{ minHeight: 90, textAlignVertical: 'top' }} />
        {send.isError && <T size={10} color={colors.orange}>{String(send.error)}</T>}
        <LimeButton title={closed ? 'срок подачи истёк' : send.isPending ? 'отправляем…' : 'подать протест'} disabled={closed || send.isPending || text.trim().length < 10 || (targetType === 'RESULT' && !targetId)} onPress={() => send.mutate()} />
        <T size={9} muted>Решение принимает главный судья до финализации турнира. Результат на время протеста помечается «под протестом» и выпадает из live-рейтинга.</T>
      </View>

      <SectionHead title="мои протесты" />
      <View style={{ gap: 7 }}>
        {(protests.data ?? []).length === 0 && <Surface radius={14} style={{ padding: 11 }}><T size={10} muted>пока нет</T></Surface>}
        {(protests.data ?? []).map((p) => (
          <Surface key={p.id} radius={14} style={{ padding: 11, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T size={10} weight="500">{p.targetType === 'RESULT' ? 'мой результат' : 'live-рейтинг'}</T><T size={9} color={p.status === 'UPHELD' ? colors.green : p.status === 'DISMISSED' ? colors.orange : colors.muted}>{STATUS[p.status] ?? p.status}</T></View>
            <T size={10}>{p.text}</T>
            {p.resolution && <T size={9} muted>решение: {p.resolution}</T>}
          </Surface>
        ))}
      </View>
      {lb.data?.isFinal && <T size={9} muted style={{ marginTop: 10 }}>Протокол финальный — протесты закрыты.</T>}
    </Page>
  );
}
