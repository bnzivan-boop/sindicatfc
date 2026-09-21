import { phoneSchema } from '@sindikat/domain';
import { Text } from 'react-native';
import { useRequestOtp } from '../../src/auth/useAuth';
import { Field } from '../../src/components/Field';
import { DeepCard, fontFamily } from '../../src/components/ui';
import { go, WizardFrame } from '../../src/features/onboarding/WizardFrame';
import { useOnboarding } from '../../src/features/onboarding/store';
import { whiteAlpha } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

export default function PhoneStep() {
  const { colors } = useTheme();
  const { draft, patch } = useOnboarding();
  const request = useRequestOtp();
  const valid = phoneSchema.safeParse(draft.phone).success;
  return (
    <WizardFrame step="phone" title="вход по телефону" subtitle="код придёт в Telegram, VK или SMS · аккаунт создаётся автоматически" nextLabel={request.isPending ? 'отправляем…' : 'получить код'} nextDisabled={!valid} busy={request.isPending} error={request.isError ? String(request.error) : null} onNext={() => request.mutate({ phone: draft.phone }, { onSuccess: (r) => { patch({ otp: { channel: r.channel, fallbacks: r.fallbacks } }); go('code'); } })}>
      <DeepCard>
        <Text style={[fontFamily, { fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', color: whiteAlpha(65) }]}>синдикат · сезон {new Date().getFullYear()}</Text>
        <Text style={[fontFamily, { fontSize: 24, lineHeight: 26, fontWeight: '500', letterSpacing: -1, color: colors.white, marginTop: 20, marginBottom: 6 }]}>Турниры, рейтинг, арсенал и трофеи — в одном месте</Text>
        <Text style={[fontFamily, { fontSize: 11, color: whiteAlpha(75) }]}>Заполнение профиля займёт две минуты. Всё можно изменить позже.</Text>
      </DeepCard>
      <Field label="телефон" value={draft.phone} onChangeText={(phone) => patch({ phone })} keyboardType="phone-pad" autoFocus placeholder="+7 900 000-00-00" style={{ fontSize: 18 }} />
    </WizardFrame>
  );
}
