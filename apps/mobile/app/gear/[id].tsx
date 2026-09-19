import { useLocalSearchParams } from 'expo-router';
import { KitEditor } from '../../src/features/gear/KitEditor';

export default function EditKitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <KitEditor id={id} />;
}
