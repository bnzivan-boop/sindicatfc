import { useState } from 'react';
import { useRequestOtp, useVerifyOtp } from '../../src/auth/useAuth';
import { Field } from '../../src/components/Field';
import { T } from '../../src/components/ui';
import { Pressable, View } from 'react-native';
import type { OtpChannel } from '@sindikat/domain';

const CHANNEL_LABEL: Record<OtpChannel, string> = { telegram: 'Telegram', vk: 'ВКонтакте', sms: 'SMS', console: 'консоль (dev)' };
import { go, WizardFrame } from '../../src/features/onboarding/WizardFrame';
import { useOnboarding } from '../../src/features/onboarding/store';
import { router } from 'expo-router';

export default function CodeStep() {
  const { draft, patch } = useOnboarding();
  const [code, setCode] = useState('');
  const verify = useVerifyOtp();
  const resend = useRequestOtp();
  const channel = draft.otp?.channel ?? 'sms';
  // Запасные каналы в порядке каскада; «console» пользователю не предлагаем
  const fallbacks = (draft.otp?.fallbacks ?? []).filter((c) => c !== 'console');
  const resendVia = (ch?: OtpChannel) => resend.mutate({ phone: draft.phone, channel: ch }, { onSuccess: (r) => patch({ otp: { channel: r.channel, fallbacks: r.fallbacks } }) });
  return (
    <WizardFrame step="code" title={`код из ${CHANNEL_LABEL[channel]}`} subtitle={`отправили на ${draft.phone} через ${CHANNEL_LABEL[channel]}`} nextLabel="войти" nextDisabled={code.length < 4} busy={verify.isPending} error={verify.isError ? String(verify.error) : null}
      onNext={() => verify.mutate(
        // Согласия TERMS/PRIVACY фиксируются на этом шаге (consents в БД); версия — из конфигурации.
        { phone: draft.phone, code, consents: [{ type: 'TERMS', version: '1.0' }, { type: 'PRIVACY', version: '1.0' }] },
        { onSuccess: (res) => (res.isNewUser ? go('about') : router.replace('/')) },
      )}>
      <Field value={code} onChangeText={setCode} keyboardType="number-pad" autoFocus maxLength={6} placeholder="••••••" style={{ fontSize: 26, letterSpacing: 8, textAlign: 'center' }} />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <T size={10} muted>{resend.isPending ? 'отправляем…' : resend.isSuccess ? `код отправлен повторно через ${CHANNEL_LABEL[channel]}` : 'код не пришёл?'}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
          <Pressable disabled={resend.isPending} onPress={() => resendVia()}><T size={11} style={{ textDecorationLine: 'underline' }}>отправить ещё раз</T></Pressable>
          {fallbacks.map((ch) => (
            <Pressable key={ch} disabled={resend.isPending} onPress={() => resendVia(ch)}><T size={11} style={{ textDecorationLine: 'underline' }}>через {CHANNEL_LABEL[ch]}</T></Pressable>
          ))}
        </View>
        {resend.isError ? <T size={10} style={{ color: '#e5484d' }}>{String(resend.error)}</T> : null}
      </View>
      <T size={9} muted style={{ textAlign: 'center' }}>Продолжая, вы принимаете правила лиги и политику приватности. В dev-режиме код 000000.</T>
    </WizardFrame>
  );
}
