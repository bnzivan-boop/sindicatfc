import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Avatar, DetailTopBar, fontFamily, Page, Round, T } from '../../../src/components/ui';
import { DIALOGS } from '../../../src/features/community/mock';
import { goBack } from '../../../src/navigation';
import { useTheme } from '../../../src/theme/useTheme';

/** dialog-view прототипа: переписка с пузырями. */
export default function DialogScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = DIALOGS.find((x) => x.id === id) ?? DIALOGS[0]!;
  const [messages, setMessages] = useState(d.messages);
  const [text, setText] = useState('');
  const send = () => { if (!text.trim()) return; setMessages([...messages, { mine: true, text: text.trim(), time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }]); setText(''); };
  return (
    <Page>
      <DetailTopBar title={d.name} left={<Round icon={ArrowLeft} onPress={() => goBack('/community/messages')} />} right={<Round icon={Phone} />} />
      <View style={{ gap: 8 }}>
        {messages.map((m, i) => (
          <View key={i} style={{ flexDirection: m.mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
            {!m.mine && <Avatar name={d.name} size={26} />}
            <View style={{ maxWidth: '78%', backgroundColor: m.mine ? colors.deep : colors.surface, borderWidth: m.mine ? 0 : 1, borderColor: colors.line, borderRadius: 14, padding: 10, gap: 3 }}>
              <T size={11} color={m.mine ? colors.white : colors.text} style={{ lineHeight: 16 }}>{m.text}</T>
              <T size={8} color={m.mine ? colors.lime : colors.muted}>{m.time}</T>
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 14 }}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder="сообщение…" placeholderTextColor={colors.muted} style={[fontFamily, { flex: 1, backgroundColor: colors.surface, color: colors.text, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12 }]} />
        <Pressable onPress={send} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}><Send size={16} color={colors.bg} strokeWidth={1.6} /></Pressable>
      </View>
    </Page>
  );
}
