import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, X } from 'lucide-react-native';
import { Image, Platform, Pressable, View } from 'react-native';
import { T } from '../../components/ui';
import { useTheme } from '../../theme/useTheme';
import type { PickedImage } from './upload';

/** Кнопки «камера» / «галерея» и превью. На web камеры нет — только выбор файла. */
export function PhotoPicker({ value, onChange, hint }: { value: PickedImage | null; onChange: (img: PickedImage | null) => void; hint?: string }) {
  const { colors } = useTheme();
  const pick = async (fromCamera: boolean) => {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, exif: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, exif: true });
    const asset = res.assets?.[0];
    if (!res.canceled && asset) onChange({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  if (value) {
    return (
      <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface2 }}>
        <Image source={{ uri: value.uri }} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" />
        <Pressable onPress={() => onChange(null)} style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} color={colors.text} />
        </Pressable>
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Platform.OS !== 'web' && (
          <Pressable onPress={() => pick(true)} style={{ flex: 1, height: 96, borderRadius: 18, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Camera size={20} color={colors.bg} strokeWidth={1.6} />
            <T size={10} color={colors.bg}>снять</T>
          </Pressable>
        )}
        <Pressable onPress={() => pick(false)} style={{ flex: 1, height: 96, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <ImageIcon size={20} color={colors.green} strokeWidth={1.6} />
          <T size={10}>из галереи</T>
        </Pressable>
      </View>
      {hint ? <T size={9} muted>{hint}</T> : null}
    </View>
  );
}
