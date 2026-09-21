import { DISCIPLINE_LABELS_RU } from '@sindikat/domain';
import { Text, View } from 'react-native';
import { SEASON_YEAR } from '../../api/helpers';
import type { Me } from '../../auth/useAuth';
import { Chip, DeepCard, fontDisplay, fontFamily, fontSemi, Track } from '../../components/ui';
import { whiteAlpha } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** .rank-card прототипа: место, очки сезона и путь в Grand Final. Живёт во вкладке «турниры». */
export function SeasonCard({ season, disciplines }: { season: Me['season']; disciplines: Me['disciplines'] }) {
  const { colors } = useTheme();
  const rank = season?.rank ?? null;
  const points = season?.points ?? 0;
  const progress = season?.finalProgress ?? 0;
  const labels = disciplines.map((d) => DISCIPLINE_LABELS_RU[d.discipline].toLowerCase());
  return (
    <DeepCard style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[fontFamily, { fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', color: whiteAlpha(65) }]}>мой сезон</Text>
        <Text style={[fontFamily, { fontSize: 10, letterSpacing: 0.9, color: whiteAlpha(65) }]}>{SEASON_YEAR}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 15, marginBottom: 19 }}>
        {labels.length > 0
          ? labels.slice(0, 3).map((d, i) => <Chip key={d} label={d} active={i === 0} />)
          : <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(60) }]}>дисциплины не выбраны</Text>}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
          <Text style={[fontSemi, { fontSize: rank ? 58 : 34, lineHeight: 54, letterSpacing: -4, color: colors.white }]}>{rank ? `#${rank}` : 'вне'}</Text>
          <Text style={[fontFamily, { fontSize: 15, color: whiteAlpha(60) }]}>{rank ? 'место' : 'рейтинга'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[fontDisplay, { fontSize: 20, color: colors.white }]}>{points.toLocaleString('ru-RU')}</Text>
          <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(60) }]}>очков сезона</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 7 }}>
        <Text style={[fontFamily, { fontSize: 10, color: whiteAlpha(70) }]}>путь в grand final</Text>
        <Text style={[fontSemi, { fontSize: 10, color: whiteAlpha(70) }]}>{progress}%</Text>
      </View>
      <Track pct={progress} />
    </DeepCard>
  );
}
