/**
 * Dev-seed: сезон (SEASON_YEAR), справочники, правила рейтинга, 30 турниров календаря.
 * Статусы турниров относительно «сегодня» расставляет seed-demo.
 * Значения коэффициентов — из прототипа (Qualifier ×1,25); утверждение — открытый вопрос №1 handoff.
 * Запуск: pnpm --filter @sindikat/api db:seed
 */
import { readFileSync } from 'node:fs';
import { PrismaClient, type Discipline, type ScoringMode, type TournamentLevel } from '../generated/prisma/index.js';
import { RULES, isSprint } from '../src/modules/tournaments/rules-templates.ts';

const prisma = new PrismaClient();

/** Год сезона. В концепции — 2027; для живого демо календарь ведём в текущем году, чтобы статусы «прошёл / идёт / открыта регистрация» совпадали с реальной датой. */
export const SEASON_YEAR = 2026;
const Y = SEASON_YEAR;

const SPECIES = [
  ['perch', 'Окунь', 'Perca fluviatilis', true],
  ['pike', 'Щука', 'Esox lucius', true],
  ['zander', 'Судак', 'Sander lucioperca', true],
  ['chub', 'Голавль', 'Squalius cephalus', false],
  ['trout', 'Форель', 'Oncorhynchus mykiss', true],
  ['bream', 'Лещ', 'Abramis brama', false],
  ['roach', 'Плотва', 'Rutilus rutilus', false],
  ['carp', 'Карп', 'Cyprinus carpio', false],
  ['crucian', 'Карась', 'Carassius', false],
  ['tench', 'Линь', 'Tinca tinca', false],
] as const;

async function main() {
  const season = await prisma.season.upsert({
    where: { year: Y },
    create: { year: Y, title: `Сезон ${Y}`, startsAt: new Date(`${Y}-02-01T00:00:00Z`), endsAt: new Date(`${Y}-11-30T23:59:59Z`), isActive: true },
    update: {},
  });

  for (const [slug, nameRu, nameLat, isPredator] of SPECIES) {
    await prisma.fishSpecies.upsert({ where: { slug }, create: { slug, nameRu, nameLat, isPredator }, update: {} });
  }

  for (const [name, region] of [['Химки', 'Московская область'], ['Одинцово', 'Московская область'], ['Мытищи', 'Московская область'], ['Балашиха', 'Московская область'], ['Люберцы', 'Московская область'], ['Санкт-Петербург', 'Санкт-Петербург'], ['Тверь', 'Тверская область'], ['Рязань', 'Рязанская область']]) {
    if (!(await prisma.city.findFirst({ where: { name } }))) await prisma.city.create({ data: { name, region } });
  }
  const moscow = await prisma.city.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: { id: '00000000-0000-0000-0000-000000000001', name: 'Москва', region: 'Москва' },
    update: {},
  });

  const rulesPayload = {
    version: `${Y}.1`,
    seasonId: season.id,
    levelCoefficients: { SPRINT: 1, QUALIFIER: 1.25, OPEN: 2, MAJOR: 3, GRAND_FINAL: 3 },
    disciplineCoefficients: {},
    bestResultsCount: 6,
    minStartsForFinal: 2,
    basePointsByPlace: [100, 85, 75, 68, 62, 57, 53, 50, 47, 45, 43, 41, 39, 37, 35, 33, 31, 29, 27, 25],
    floorPoints: 10,
    tieBreakers: ['BIGGEST_FISH', 'MORE_FISH', 'HEAD_TO_HEAD'],
  };
  // compound unique с NULL discipline не подходит для upsert — проверяем явно
  const existingRules = await prisma.rankingRules.findFirst({ where: { seasonId: season.id, discipline: null, version: `${Y}.1` } });
  if (!existingRules) {
    // правила действуют с момента публикации, а не с первого старта — иначе финализация тестовых турниров до сезона невозможна
    await prisma.rankingRules.create({ data: { seasonId: season.id, version: `${Y}.1`, activeFrom: new Date(`${Y - 1}-12-01T00:00:00Z`), payload: rulesPayload } });
  }

  const brand = await prisma.gearBrand.upsert({ where: { name: 'Major Craft' }, create: { name: 'Major Craft' }, update: {} });
  await prisma.gearModel.upsert({
    where: { brandId_type_name: { brandId: brand.id, type: 'ROD', name: 'Finetail Stream FSX-B4102UL' } },
    create: { brandId: brand.id, type: 'ROD', name: 'Finetail Stream FSX-B4102UL', specs: { lengthMm: 3050, lureTestMinG: 1, lureTestMaxG: 7 } },
    update: {},
  });

  const admin = await prisma.user.upsert({
    where: { phone: '+79990000001' },
    create: { phone: '+79990000001', profile: { create: { displayName: 'Организатор лиги', cityId: moscow.id, onboardingCompletedAt: new Date() } }, roles: { create: [{ role: 'USER' }, { role: 'SYSTEM_ADMIN' }, { role: 'ORGANIZER' }] } },
    update: {},
  });

  const tournament = await prisma.tournament.upsert({
    where: { slug: `urban-street-open-${Y}` },
    create: {
      seasonId: season.id,
      slug: `urban-street-open-${Y}`,
      title: 'Urban Street Open',
      description: 'Открытие городского блока сезона. Москва-река, Лужнецкая набережная.',
      discipline: 'STREET',
      level: 'OPEN',
      status: 'REGISTRATION_OPEN',
      scoringMode: 'LENGTH_SUM',
      formats: ['SOLO', 'PAIR'],
      capacity: 40,
      coefficient: 2,
      entryFeeMinor: 300_000,
      startsAt: new Date(`${Y}-07-17T06:00:00Z`),
      endsAt: new Date(`${Y}-07-17T09:00:00Z`),
      reserveDate: new Date(`${Y}-07-24T06:00:00Z`),
      registrationOpensAt: new Date(`${Y}-06-17T09:00:00Z`),
      registrationClosesAt: new Date(`${Y}-07-15T21:00:00Z`),
      createdBy: admin.id,
      location: { create: { title: 'Лужнецкая набережная', address: 'Москва, Лужнецкая наб.', meetingPoint: 'Штаб у причала', parking: 'Парковка стадиона, сектор B' } },
      schedule: {
        create: [
          { at: new Date(`${Y}-07-17T05:00:00Z`), title: 'Регистрация и выдача маркеров', sortOrder: 1 },
          { at: new Date(`${Y}-07-17T06:00:00Z`), title: 'Старт тура', sortOrder: 2 },
          { at: new Date(`${Y}-07-17T09:00:00Z`), title: 'Финиш · протесты 30 минут', sortOrder: 3 },
          { at: new Date(`${Y}-07-17T10:00:00Z`), title: 'Награждение', sortOrder: 4 },
        ],
      },
      rules: {
        create: {
          version: 1,
          allowedTackle: ['одна активная спиннинговая снасть', 'искусственные приманки'],
          forbiddenTackle: ['натуральные насадки', 'более одной снасти в воде', 'ловля вне зоны'],
          scoringSummary: 'Сумма длины 5 лучших рыб, не более 3 рыб одного вида. Отдельная номинация Big Fish.',
          fixationSummary: 'Фото на официальной линейке с номером участника и маркером турнира, немедленный выпуск.',
          penalties: ['нечёткий маркер — повторное фото', 'рыба вне зоны — аннулирование'],
          scoringParams: { fishCount: 5, maxPerSpecies: 3 },
          publishedAt: new Date(),
        },
      },
      // dev: маркер валиден весь сезон, чтобы прогонять live-сценарий до даты турнира
      markers: { create: { code: 'USO-17', validFrom: new Date('2026-01-01T00:00:00Z'), validTo: new Date(`${Y}-12-31T23:59:59Z`) } },
    },
    update: {},
  });


  // ── Календарь сезона: 30 стартов из прототипа / концепции ──
  type SeasonEvent = { month: number; day: number; type: string; title: string; sub: string; level: string };
  const events: SeasonEvent[] = JSON.parse(readFileSync(new URL('./season-2027.json', import.meta.url), 'utf-8'));
  const DISC: Record<string, Discipline> = { ice: 'ICE', trout: 'AREA_TROUT', street: 'STREET', float: 'FLOAT', feeder: 'FEEDER', jig: 'SHORE_JIG' };
  const LEVEL: Record<string, TournamentLevel> = { sprint: 'SPRINT', qualifier: 'QUALIFIER', 'open ×2': 'OPEN', 'major ×3': 'MAJOR', 'final ×3': 'GRAND_FINAL' };
  const COEF: Record<TournamentLevel, number> = { SPRINT: 1, QUALIFIER: 1.25, OPEN: 2, MAJOR: 3, GRAND_FINAL: 3 };
  const SCORING: Record<Discipline, ScoringMode> = { STREET: 'LENGTH_SUM', SHORE_JIG: 'LENGTH_SUM', BOAT: 'LENGTH_SUM', AREA_TROUT: 'DUEL_POINTS', FEEDER: 'TOTAL_WEIGHT', FLOAT: 'PLACE_SUM', ICE: 'TOTAL_WEIGHT' };
  const PLACE: Record<Discipline, string> = { STREET: 'Москва-река', SHORE_JIG: 'Пироговское вдхр.', BOAT: 'Иваньковское вдхр.', AREA_TROUT: 'форелевый клуб «Сосенки»', FEEDER: 'Канал им. Москвы', FLOAT: 'Борисовские пруды', ICE: 'Строгинская пойма' };
  const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  for (const e of events) {
    const slug = `${slugify(e.title)}-${Y}-${String(e.month).padStart(2, '0')}`;
    if (slug.startsWith('urban-street-open')) continue; // создан выше с полной карточкой
    const discipline = DISC[e.type]!;
    const level = LEVEL[e.level]!;
    const tpl = RULES[discipline];
    const tier = isSprint(level) ? 'sprint' : 'open';
    const startsAt = new Date(Date.UTC(Y, e.month - 1, e.day, e.type === 'ice' ? 6 : 7, 0));
    const durationH = tpl.durationH[tier];
    await prisma.tournament.upsert({
      where: { slug },
      create: {
        seasonId: season.id, slug, title: e.title, description: e.sub, discipline, level,
        status: 'PUBLISHED',
        scoringMode: SCORING[discipline],
        formats: e.sub.includes('парн') || e.sub.includes('команд') ? ['PAIR'] : ['SOLO', 'PAIR'],
        capacity: tpl.capacity[tier],
        coefficient: COEF[level],
        entryFeeMinor: tpl.entryFee[tier],
        startsAt, endsAt: new Date(startsAt.getTime() + durationH * 3_600_000),
        createdBy: admin.id,
        location: { create: { title: PLACE[discipline], address: `${PLACE[discipline]}, Москва и область`, meetingPoint: tpl.meetingPoint, parking: tpl.parking } },
      },
      // условия участия берём из шаблона дисциплины и при повторном seed тоже
      update: { capacity: tpl.capacity[tier], entryFeeMinor: tpl.entryFee[tier], endsAt: new Date(startsAt.getTime() + durationH * 3_600_000) },
    });
  }

  // ── регламент, тайминг и описание для всех турниров без опубликованного регламента
  for (const t of await prisma.tournament.findMany({ include: { rules: true, schedule: true } })) {
    const tpl = RULES[t.discipline];
    if (t.rules.length === 0) {
      await prisma.tournamentRules.create({
        data: { tournamentId: t.id, version: 1, allowedTackle: tpl.allowedTackle, forbiddenTackle: tpl.forbiddenTackle, scoringSummary: tpl.scoringSummary, fixationSummary: tpl.fixationSummary, penalties: tpl.penalties, scoringParams: tpl.scoringParams, publishedAt: new Date() },
      });
    }
    if (t.schedule.length === 0) {
      const endH = (t.endsAt.getTime() - t.startsAt.getTime()) / 3_600_000;
      await prisma.tournamentScheduleItem.createMany({
        data: tpl.schedule.map(([h, title], i) => ({ tournamentId: t.id, at: new Date(t.startsAt.getTime() + (h === null ? endH : h) * 3_600_000), title, sortOrder: i })),
      });
    }
    if (!t.description || t.description.length < 60) {
      await prisma.tournament.update({ where: { id: t.id }, data: { description: `${t.description ? t.description[0]!.toUpperCase() + t.description.slice(1) + '. ' : ''}${tpl.description}` } });
    }
    const loc = await prisma.tournamentLocation.findUnique({ where: { tournamentId: t.id } });
    if (loc && !loc.meetingPoint) await prisma.tournamentLocation.update({ where: { tournamentId: t.id }, data: { meetingPoint: tpl.meetingPoint, parking: tpl.parking } });
  }

  console.log(`seed ok: season ${season.year}, ${events.length} tournaments incl. ${tournament.slug}, admin ${admin.phone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
