import { ArrowLeft, ExternalLink, Trophy } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { useMe } from '../src/auth/useAuth';
import { DetailTopBar, InfoList, InfoRow, LimeButton, Page, PageTitle, Round, Surface, T } from '../src/components/ui';
import { goBack } from '../src/navigation';

const CRM_URL = process.env.EXPO_PUBLIC_CRM_URL ?? 'http://localhost:3001';

/** Кабинет организатора живёт в CRM (web): здесь — вход по той же роли и краткая справка. */
export default function OrganizerScreen() {
  const me = useMe();
  const isOrganizer = me.data?.roles.some((r) => ['ORGANIZER', 'JUDGE', 'HEAD_JUDGE', 'SYSTEM_ADMIN'].includes(r.role));
  return (
    <Page>
      <DetailTopBar title="кабинет организатора" left={<Round icon={ArrowLeft} onPress={() => goBack()} />} />
      <PageTitle title="организатор" subtitle="допуски, судьи, участники, бюджет — в CRM лиги" />
      <View style={{ gap: 12 }}>
        <Surface radius={16}><T size={11} style={{ lineHeight: 16 }}>Создание турниров, регламенты, выдача стартовых номеров, чек-ин, очередь судьи, протесты, финализация и рейтинг сезона ведутся в веб-кабинете. Вход — тем же номером телефона.</T></Surface>
        <LimeButton title="открыть CRM" onPress={() => Linking.openURL(CRM_URL)} />
        <InfoList>
          <InfoRow icon={Trophy} label={isOrganizer ? 'ваши роли' : 'доступ'} value={isOrganizer ? me.data!.roles.map((r) => r.role.toLowerCase()).join(', ') : 'роль организатора или судьи выдаёт администратор лиги'} />
          <InfoRow icon={ExternalLink} label="адрес" value={CRM_URL} />
        </InfoList>
      </View>
    </Page>
  );
}
