import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { fontFamily } from './ui';
import { useTheme } from '../theme/useTheme';

/** .form-field прототипа: подпись сверху, поле на surface. */
export function Field({ label, style, ...rest }: TextInputProps & { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 5 }}>
      {label ? <Text style={[fontFamily, { fontSize: 9, color: colors.muted }]}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} {...rest} style={[fontFamily, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, color: colors.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 }, style]} />
    </View>
  );
}
