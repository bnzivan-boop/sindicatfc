import type { ParticipationFormat } from '@sindikat/domain';
import { Ship, Shield, User, Users, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { money } from '../../api/helpers';
import { LimeButton, T } from '../../components/ui';
import { useTheme } from '../../theme/useTheme';

const META: Record<ParticipationFormat, { icon: LucideIcon; label: string; mult: number }> = { SOLO: { icon: User, label: 'лично', mult: 1 }, PAIR: { icon: Users, label: 'пара', mult: 2 }, TEAM: { icon: Shield, label: 'команда', mult: 4 }, CREW: { icon: Ship, label: 'экипаж', mult: 2 } };

/** .format-grid + .sheet-footer из прототипа: выбор формата и итоговая цена. */
export function FormatSheet({ formats, feeMinor, busy, onContinue }: { formats: ParticipationFormat[]; feeMinor: number | null; busy?: boolean; onContinue: (f: ParticipationFormat) => void }) {
  const { colors } = useTheme();
  const [format, setFormat] = useState<ParticipationFormat>(formats[0] ?? 'SOLO');
  const price = feeMinor ? money(feeMinor * META[format].mult) : 'бесплатно';
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {formats.map((f) => { const m = META[f]; const active = f === format; return (
          <Pressable key={f} onPress={() => setFormat(f)} style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 15, borderWidth: 1, borderColor: active ? colors.green : colors.line, backgroundColor: active ? `${colors.green}17` : colors.surface }}>
            <m.icon size={18} color={active ? colors.green : colors.text} strokeWidth={1.6} />
            <T size={10} weight="500">{m.label}</T>
          </Pressable>
        ); })}
      </View>
      {format !== 'SOLO' && <T size={9} muted>После создания заявки пригласите {format === 'TEAM' ? 'участников команды' : 'напарника'} — заявка подтвердится, когда все примут приглашение и будет внесён взнос.</T>}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View><T size={16} weight="500">{price}</T><T size={9} muted>{META[format].label === 'лично' ? 'личный зачёт' : `${META[format].label} · ${META[format].mult} × взнос`}</T></View>
        <View style={{ flex: 1 }}><LimeButton title={busy ? 'создаём…' : 'продолжить'} disabled={busy} onPress={() => onContinue(format)} /></View>
      </View>
    </View>
  );
}
