import { goBack } from '../../src/navigation';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { DetailTopBar, Page, PageTitle, Round, Surface, T } from '../../src/components/ui';

export default function Screen() {
  return (
    <Page>
      <DetailTopBar title="карта" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} />
      <PageTitle title="карта" subtitle="премиум · глубины и точки" />
      <Surface><T size={11} muted>Карта водоёмов и глубин — платный раздел, после MVP (handoff §3). Экран из прототипа map-view будет перенесён на этапе 6.</T></Surface>
    </Page>
  );
}
