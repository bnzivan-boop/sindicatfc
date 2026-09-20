/**
 * Демо-данные поверх базового seed: пользователи, арсенал, трофеи, участники,
 * результаты live-турнира, два завершённых этапа с очками, уведомления.
 * Идемпотентен: повторный запуск ничего не дублирует.
 * Вход в приложение: любой номер из списка ниже, код 000000 (OTP_DEV_CODE).
 * Статусы турниров расставляются относительно текущей даты (см. LIVE_CUTOFF).
 */
import { calculatePoints, type RankingRules } from '@sindikat/domain';
import { PrismaClient, type Discipline } from '../generated/prisma/index.js';

const prisma = new PrismaClient();


/** Демо-участники из прототипа. Первый — «я» (Алексей Смирнов, #12 в street). */
/** Аккаунты, которые получают полный набор «моих» данных (заявки, live, уловы, уведомления). */
const HEROES = ['+79990000002', '+79637686719'];

const USERS: Array<{ phone: string; name: string; city: string; exp: number; disciplines: Discipline[]; kit?: string; bio?: string; keepProfile?: boolean }> = [
  { phone: '+79990000002', name: 'Алексей Смирнов', city: 'Москва', exp: 12, disciplines: ['STREET', 'AREA_TROUT', 'FEEDER'], kit: 'Graphiteleader Corto 0,6–8 г', bio: 'Городской стрит по Москве-реке, форель по выходным.' },
  { phone: '+79990000003', name: 'Илья Сафин', city: 'Москва', exp: 15, disciplines: ['STREET', 'SHORE_JIG'], kit: 'Major Craft Finetail 1–7 г' },
  { phone: '+79990000004', name: 'Денис Крылов', city: 'Химки', exp: 9, disciplines: ['STREET', 'SHORE_JIG', 'BOAT'], kit: 'Daiwa Presso 0,4–5 г' },
  { phone: '+79990000005', name: 'Андрей Морозов', city: 'Москва', exp: 20, disciplines: ['STREET', 'ICE'], kit: 'Yamaga Blanks Blue Current 0,5–6 г' },
  { phone: '+79990000006', name: 'Никита Волков', city: 'Одинцово', exp: 6, disciplines: ['STREET', 'FLOAT'], kit: 'Tict Sram 0,3–4 г' },
  { phone: '+79990000007', name: 'Роман Орлов', city: 'Москва', exp: 11, disciplines: ['STREET', 'FEEDER'], kit: 'Norstream Provokator 1–8 г' },
  { phone: '+79990000008', name: 'Егор Панов', city: 'Мытищи', exp: 4, disciplines: ['STREET'], kit: 'Favorite Blue Bird 0,5–5 г' },
  { phone: '+79990000009', name: 'Мария Лебедева', city: 'Москва', exp: 7, disciplines: ['AREA_TROUT', 'STREET'], kit: 'Anglers Republic Palms 0,8–5 г' },
  { phone: '+79990000010', name: 'Сергей Кузнецов', city: 'Балашиха', exp: 18, disciplines: ['FEEDER', 'FLOAT'], kit: 'Flagman Squadron 60–120 г' },
  { phone: '+79990000011', name: 'Павел Громов', city: 'Москва', exp: 13, disciplines: ['SHORE_JIG', 'BOAT'], kit: 'Zenaq Snipe 7–28 г' },
  { phone: '+79990000012', name: 'Тимур Асланов', city: 'Люберцы', exp: 3, disciplines: ['STREET'], kit: 'Crazy Fish Arion 0,5–6 г' },
  { phone: '+79990000013', name: 'Ольга Зайцева', city: 'Москва', exp: 5, disciplines: ['AREA_TROUT'], kit: 'Nories Spike Arrow 0,6–4 г' },
  { phone: '+79990000020', name: 'Виктор Судейкин', city: 'Москва', exp: 25, disciplines: ['STREET'] }, // судья
  { phone: '+79637686719', name: 'Иван', city: 'Москва', exp: 8, disciplines: ['STREET', 'SHORE_JIG', 'AREA_TROUT'], kit: 'Graphiteleader Bellezza 0,5–5 г', keepProfile: true }, // владелец продукта
];

async function main() {
  const season = await prisma.season.findFirstOrThrow({ where: { isActive: true } });
  const species = Object.fromEntries((await prisma.fishSpecies.findMany()).map((s) => [s.slug, s.id]));
    const rulesRow = await prisma.rankingRules.findFirstOrThrow({ where: { seasonId: season.id, discipline: null } });
  const rules = rulesRow.payload as unknown as RankingRules;

  // ── города
  const cityIds = new Map<string, string>();
  for (const name of new Set(USERS.map((u) => u.city))) {
    const c = (await prisma.city.findFirst({ where: { name } })) ?? (await prisma.city.create({ data: { name, region: 'Московская область' } }));
    cityIds.set(name, c.id);
  }

  // ── пользователи, профили, дисциплины, комплекты
  const userIds = new Map<string, string>();
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      create: { phone: u.phone, roles: { create: { role: 'USER' } }, consents: { create: [{ type: 'TERMS', version: '1.0', source: 'seed' }, { type: 'PRIVACY', version: '1.0', source: 'seed' }] } },
      update: {},
    });
    userIds.set(u.phone, user.id);
    await prisma.userProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, displayName: u.name, cityId: cityIds.get(u.city), experienceYears: u.exp, bio: u.bio, waterTypes: ['RIVER', 'RESERVOIR'], onboardingCompletedAt: new Date() }, update: u.keepProfile ? { onboardingCompletedAt: new Date() } : { displayName: u.name, cityId: cityIds.get(u.city), experienceYears: u.exp, onboardingCompletedAt: new Date() } });
    // дисциплины — из seed (для героев тоже: иначе очки сезона будут в «пустой» дисциплине); имя/город keepProfile не трогает
    await prisma.userDiscipline.deleteMany({ where: { userId: user.id } });
    await prisma.userDiscipline.createMany({ data: u.disciplines.map((discipline, i) => ({ userId: user.id, discipline, priority: i + 1 })) });
    if (u.kit && !(await prisma.gearKit.findFirst({ where: { ownerId: user.id, name: 'Основной street' } }))) {
      const [brand, ...rest] = u.kit.split(' ');
      const model = rest.join(' ').replace(/\s[\d,]+–[\d,]+ г$/, '');
      const test = u.kit.match(/([\d,]+)–([\d,]+) г/);
      await prisma.gearKit.create({
        data: {
          ownerId: user.id, name: 'Основной street', discipline: u.disciplines[0]!, isPrimary: true, targetSpeciesIds: [species['perch']!, species['pike']!].filter(Boolean),
          rod: { type: 'SPINNING', customBrand: brand, customModel: model, lengthMm: 2290, lureTestMinG: test ? Number(test[1]!.replace(',', '.')) : undefined, lureTestMaxG: test ? Number(test[2]!.replace(',', '.')) : undefined },
          reel: { type: 'SPINNING', customBrand: 'Shimano', customModel: 'Vanquish', size: 'C2000S', weightG: 155 },
          mainLine: { type: 'BRAID', customBrand: 'YGK X-Braid Upgrade', peSize: '#0.4', breakingLoadLb: 8, color: 'лайм' },
          leader: { material: 'FLUOROCARBON', customBrand: 'Seaguar', diameterMm: 0.2, lengthCm: 80 },
          lures: [{ type: 'джиг-головка', weightG: 3 }, { type: 'виброхвост 2"' }, { type: 'микроколебалка', weightG: 2.5 }],
          comment: 'для течения и глубины до 4 м',
        },
      });
    }
  }
  const me = userIds.get('+79990000002')!;

  // ── лодка и дневник для «меня»
  for (const hero of HEROES) {
    const hid = userIds.get(hero)!;
    if (!(await prisma.boat.findFirst({ where: { ownerId: hid } }))) {
      await prisma.boat.create({ data: { ownerId: hid, type: 'PVC', customName: 'Gladiator E330', lengthCm: 330, seats: 3, capacityKg: 450, equipment: { motor: { customBrand: 'Tohatsu', customModel: 'M9.8', powerHp: 9.8 }, sonar: 'Garmin Striker 4', trailer: false }, availableForTeamTrips: true } });
    }
  }
  const CATCHES: Array<[string, number, number, string, Date, boolean]> = [
    ['perch', 340, 520, 'Вечер, Лужнецкая набережная, бровка на течении — поклёвка на паузе.', new Date('2026-08-12T17:40:00Z'), true],
    ['pike', 780, 3100, 'Карьер под Дмитровом, воблер по кромке травы.', new Date('2026-07-05T05:10:00Z'), true],
    ['zander', 520, 1400, 'Ночной судак на джиг, свал 6 м.', new Date('2026-09-02T21:30:00Z'), true],
    ['chub', 310, 380, 'Голавль на крэнк под нависшим кустом.', new Date('2026-06-20T08:00:00Z'), false],
    ['perch', 250, 210, 'Тренировка перед стартом, микроджиг.', new Date('2026-09-15T16:00:00Z'), false],
  ];
  for (const hero of HEROES) {
    const hid = userIds.get(hero)!;
    if ((await prisma.catch.count({ where: { ownerId: hid } })) > 0) continue;
    const kit = await prisma.gearKit.findFirst({ where: { ownerId: hid } });
    for (const [slug, lengthMm, weightG, description, caughtAt, trophy] of CATCHES) {
      const c = await prisma.catch.create({ data: { ownerId: hid, speciesId: species[slug]!, lengthMm: lengthMm + (hero === HEROES[0] ? 0 : 15), weightG, description, caughtAt, gearLink: { create: { gearKitId: kit?.id } }, location: { create: { privacy: 'WATERBODY_ONLY' } } } });
      if (trophy) await prisma.trophy.create({ data: { catchId: c.id, status: 'PUBLISHED', isPersonalRecord: true, recordType: 'LENGTH' } });
    }
  }

  // детерминированный «рандом», чтобы данные не менялись от запуска к запуску
  let seed = 42;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

  // ── трофеи других участников — чтобы публичные профили были живыми
  const OTHERS_CATCHES: Array<[string, string, number, number, string, string]> = [
    ['+79990000003', 'pike', 920, 5600, 'Щука на 5,6 кг с Пироговки — джиг 14 г по бровке на 7 метрах.', '2026-05-09T05:30:00Z'],
    ['+79990000003', 'zander', 640, 2900, 'Ночной судак под мостом, тёмный виброхвост.', '2026-08-30T22:10:00Z'],
    ['+79990000003', 'perch', 380, 780, 'Горбач на микроколебалку, Москва-река.', '2026-07-19T06:00:00Z'],
    ['+79990000004', 'zander', 710, 4100, 'Клыкастый на 4,1 кг, Иваньковское, свал 9 м.', '2026-06-14T04:40:00Z'],
    ['+79990000004', 'chub', 420, 1100, 'Голавль на крэнк у коряги.', '2026-08-02T07:15:00Z'],
    ['+79990000005', 'pike', 1040, 8200, 'Личный рекорд: щука 104 см на Рыбинке, джерк.', '2026-05-23T09:00:00Z'],
    ['+79990000009', 'trout', 480, 1350, 'Форель на паузе, колебалка 2,5 г.', '2026-03-21T10:20:00Z'],
  ];
  for (const [phone, slug, lengthMm, weightG, description, at] of OTHERS_CATCHES) {
    const uid = userIds.get(phone)!;
    if (await prisma.catch.findFirst({ where: { ownerId: uid, speciesId: species[slug]!, lengthMm } })) continue;
    const kit = await prisma.gearKit.findFirst({ where: { ownerId: uid } });
    const c = await prisma.catch.create({ data: { ownerId: uid, speciesId: species[slug]!, lengthMm, weightG, description, caughtAt: new Date(at), gearLink: { create: { gearKitId: kit?.id } }, location: { create: { privacy: 'WATERBODY_ONLY' } } } });
    await prisma.trophy.create({ data: { catchId: c.id, status: 'PUBLISHED', isPersonalRecord: lengthMm >= 700, recordType: 'LENGTH' } });
  }

  // ── реакции на трофеи: лайки и пара комментариев, чтобы лента не была пустой
  {
    const trophies = await prisma.trophy.findMany({ where: { status: 'PUBLISHED' }, include: { catch: true }, orderBy: { promotedAt: 'desc' } });
    const ids = [...userIds.values()];
    const COMMENTS = ['Красавец! На какую глубину ставил?', 'Поздравляю, зачётный экземпляр', 'Это же Пироговка? Там сейчас судак пошёл', 'Отпустил? 🎣', 'Вот это трофей сезона'];
    let k = 0;
    for (const t of trophies) {
      const likers = ids.filter((u) => u !== t.catch.ownerId).sort(() => rnd() - 0.5).slice(0, 2 + Math.floor(rnd() * 6));
      for (const userId of likers) await prisma.catchLike.upsert({ where: { catchId_userId: { catchId: t.catchId, userId } }, create: { catchId: t.catchId, userId }, update: {} });
      if ((await prisma.catchComment.count({ where: { catchId: t.catchId } })) === 0 && rnd() < 0.7) {
        const author = likers[0];
        if (author) await prisma.catchComment.create({ data: { catchId: t.catchId, authorId: author, text: COMMENTS[k++ % COMMENTS.length]! } });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Календарь относительно «сегодня»:
  //   старт до LIVE_CUTOFF        → FINALIZED: заявки, результаты, протокол, очки сезона
  //   старт между LIVE_CUTOFF…now → LIVE: чек-ин, принятые результаты, live-рейтинг, очередь судьи
  //   старт позже                 → REGISTRATION_OPEN
  // ══════════════════════════════════════════════════════════════════════
  const now = new Date();
  const LIVE_CUTOFF = new Date(now.getTime() - 7 * 86_400_000); // «на прошлой неделе» — уже прошёл; «на этой» — идёт

  // сброс всего турнирного состояния, чтобы seed был воспроизводим
  await prisma.rankingLedger.deleteMany({ where: { seasonId: season.id } });
  await prisma.rankingEntry.deleteMany({ where: { seasonId: season.id } });
  await prisma.leaderboardSnapshot.deleteMany({});
  await prisma.protest.deleteMany({});
  await prisma.resultCorrection.deleteMany({});
  await prisma.result.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.waitlistEntry.deleteMany({});
  await prisma.registrationMember.deleteMany({});
  await prisma.registration.deleteMany({});

  const players = USERS.filter((u) => u.phone !== '+79990000020');
  const judge = userIds.get('+79990000020')!;
  const tournaments = await prisma.tournament.findMany({ where: { seasonId: season.id }, include: { rules: true }, orderBy: { startsAt: 'asc' } });

  const speciesFor: Record<Discipline, string[]> = { STREET: ['perch', 'pike', 'chub', 'zander'], SHORE_JIG: ['zander', 'pike'], BOAT: ['zander', 'pike'], AREA_TROUT: ['trout'], FEEDER: ['bream', 'roach', 'carp'], FLOAT: ['crucian', 'roach', 'carp', 'tench'], ICE: ['perch', 'roach'] };
  const minLen: Record<string, number> = { zander: 400, pike: 450 };

  for (const t of tournaments) {
    const isPast = t.startsAt < LIVE_CUTOFF;
    const isLive = !isPast && t.startsAt <= now;
    // участники: у кого дисциплина в приоритетах + «я» почти везде; 8–12 человек
    // «я» — только в своих дисциплинах и примерно в каждом втором старте
    const isLiveNow = t.startsAt >= LIVE_CUTOFF && t.startsAt <= now;
    // «герои» — в live-турнире всегда (для демо отправки рыбы), иначе примерно в каждом втором старте своих дисциплин
    const heroes = players.filter((u) => HEROES.includes(u.phone));
    const heroesIn = heroes.filter((u) => isLiveNow || (u.disciplines.includes(t.discipline) && rnd() < 0.55));
    const others = players.filter((u) => !HEROES.includes(u.phone));
    const pool = others.filter((u) => u.disciplines.includes(t.discipline));
    const extra = others.filter((u) => !pool.includes(u)).sort(() => rnd() - 0.5);
    const count = Math.min(t.capacity, 8 + Math.floor(rnd() * 5));
    const roster = [...heroesIn, ...pool, ...extra].slice(0, count);

    if (!isPast && !isLive) {
      await prisma.tournament.update({ where: { id: t.id }, data: { status: 'REGISTRATION_OPEN', registrationOpensAt: new Date(now.getTime() - 14 * 86_400_000), registrationClosesAt: new Date(t.startsAt.getTime() - 2 * 86_400_000) } });
      // немного «чужих» заявок, чтобы счётчик мест был живым
      for (const u of roster.slice(0, 3 + Math.floor(rnd() * 4))) {
        if (u.phone === '+79990000002') continue;
        const reg = await prisma.registration.create({ data: { tournamentId: t.id, ownerId: userIds.get(u.phone)!, format: 'SOLO', status: 'CONFIRMED', amountMinor: t.entryFeeMinor, idempotencyKey: `seed-${t.slug}-${u.phone}`, members: { create: { userId: userIds.get(u.phone)!, role: 'OWNER', invitationStatus: 'ACCEPTED', respondedAt: now } } } });
        await prisma.payment.create({ data: { registrationId: reg.id, provider: 'stub', status: 'SUCCEEDED', paidAt: now, amountMinor: t.entryFeeMinor ?? 0, idempotencyKey: `seed-pay-${reg.id}` } });
      }
      continue;
    }

    // заявки
    const regStatus = isPast ? 'FINISHED' : 'CHECKED_IN';
    for (const [i, u] of roster.entries()) {
      const uid = userIds.get(u.phone)!;
      const reg = await prisma.registration.create({ data: { tournamentId: t.id, ownerId: uid, format: 'SOLO', status: regStatus, amountMinor: t.entryFeeMinor, startNumber: String(i + 1).padStart(2, '0'), idempotencyKey: `seed-${t.slug}-${u.phone}`, members: { create: { userId: uid, role: 'OWNER', invitationStatus: 'ACCEPTED', respondedAt: t.startsAt } } } });
      await prisma.payment.create({ data: { registrationId: reg.id, provider: 'stub', status: 'SUCCEEDED', paidAt: new Date(t.startsAt.getTime() - 3 * 86_400_000), amountMinor: t.entryFeeMinor ?? 0, idempotencyKey: `seed-pay-${reg.id}` } });
    }
    if (isLive) {
      await prisma.competitionMarker.upsert({ where: { tournamentId_code: { tournamentId: t.id, code: 'LIVE-01' } }, create: { tournamentId: t.id, code: 'LIVE-01', validFrom: new Date(now.getTime() - 86_400_000), validTo: new Date(now.getTime() + 86_400_000) }, update: {} });
      if (!(await prisma.userRole.findFirst({ where: { userId: judge, role: 'JUDGE', scopeId: t.id } }))) await prisma.userRole.create({ data: { userId: judge, role: 'JUDGE', scopeType: 'TOURNAMENT', scopeId: t.id } });
      // финиш — через 3 часа от seed, чтобы таймер и окно протестов были живыми
      await prisma.tournament.update({ where: { id: t.id }, data: { status: 'LIVE', endsAt: new Date(now.getTime() + 3 * 3_600_000), registrationOpensAt: new Date(t.startsAt.getTime() - 30 * 86_400_000), registrationClosesAt: new Date(t.startsAt.getTime() - 2 * 86_400_000) } });
    }

    // результаты и протокол
    const params = (t.rules[0]?.scoringParams ?? {}) as { fishCount?: number; maxPerSpecies?: number | null };
    const fishCount = params.fishCount ?? 5;
    const entries: Array<{ participantId: string; displayName: string; score: number; countedFish: number; biggestFishMm: number | null }> = [];
    for (const u of roster) {
      const uid = userIds.get(u.phone)!;
      const skill = 0.55 + rnd() * 0.45 - (HEROES.includes(u.phone) ? 0.05 : 0);
      if (t.scoringMode === 'LENGTH_SUM') {
        const n = Math.max(1, Math.round(fishCount * skill * (isLive ? 0.6 : 1)));
        const lengths: Array<{ speciesId: string; lengthMm: number }> = [];
        for (let k = 0; k < n; k++) {
          const slug = speciesFor[t.discipline][Math.floor(rnd() * speciesFor[t.discipline].length)]!;
          const base = minLen[slug] ?? 250;
          const lengthMm = base + Math.round(rnd() * (slug === 'pike' || slug === 'zander' ? 300 : 150) * skill);
          lengths.push({ speciesId: species[slug]!, lengthMm });
          await prisma.result.create({ data: { tournamentId: t.id, participantId: uid, clientId: `seed-${t.slug}-${u.phone}-${k}`, speciesId: species[slug]!, lengthMm, markerCode: isLive ? 'LIVE-01' : 'SEED', status: 'ACCEPTED', capturedAt: new Date(t.startsAt.getTime() + (k + 1) * 20 * 60_000), submittedAt: new Date(t.startsAt.getTime() + (k + 1) * 21 * 60_000), decisions: { create: { judgeId: judge, decision: 'ACCEPT', lengthMm } } } });
        }
        const sorted = lengths.sort((a, b) => b.lengthMm - a.lengthMm);
        const per = new Map<string, number>(); const counted: typeof sorted = [];
        for (const r of sorted) { if (counted.length >= fishCount) break; const c = per.get(r.speciesId) ?? 0; if (params.maxPerSpecies && c >= params.maxPerSpecies) continue; per.set(r.speciesId, c + 1); counted.push(r); }
        entries.push({ participantId: uid, displayName: u.name, score: counted.reduce((s, r) => s + r.lengthMm, 0), countedFish: counted.length, biggestFishMm: sorted[0]?.lengthMm ?? null });
      } else if (t.scoringMode === 'TOTAL_WEIGHT') {
        const fish = 3 + Math.floor(rnd() * 12);
        entries.push({ participantId: uid, displayName: u.name, score: Math.round((2000 + rnd() * 9000) * skill), countedFish: fish, biggestFishMm: null }); // граммы
      } else if (t.scoringMode === 'DUEL_POINTS') {
        entries.push({ participantId: uid, displayName: u.name, score: Math.round(9 * skill), countedFish: Math.round(12 * skill), biggestFishMm: null }); // очки дуэлей
      } else {
        entries.push({ participantId: uid, displayName: u.name, score: Math.round(30 * (1 - skill)) + 3, countedFish: Math.round(10 * skill), biggestFishMm: null }); // сумма мест (меньше — лучше)
      }
    }
    const asc = t.scoringMode === 'PLACE_SUM';
    entries.sort((a, b) => (asc ? a.score - b.score : b.score - a.score) || (b.biggestFishMm ?? 0) - (a.biggestFishMm ?? 0));
    const payload = entries.map((e, i) => ({ place: i + 1, startNumber: null, updatedAt: (isPast ? t.endsAt : now).toISOString(), ...e }));
    await prisma.leaderboardSnapshot.create({ data: { tournamentId: t.id, version: 1, payload, isFinal: isPast } });

    if (isPast) {
      await prisma.tournament.update({ where: { id: t.id }, data: { status: 'FINALIZED' } });
      for (const e of payload) {
        const b = calculatePoints(rules, { place: e.place, fieldSize: payload.length, level: t.level, discipline: t.discipline });
        await prisma.rankingLedger.create({ data: { userId: e.participantId, seasonId: season.id, discipline: t.discipline, tournamentId: t.id, type: 'TOURNAMENT_RESULT', delta: b.total, rulesVersion: rules.version, breakdown: { ...b }, createdAt: t.endsAt } });
      }
    } else {
      // live: один результат «у судьи» и один «нужно новое фото» — для демо судейства
      for (const h of heroes) await prisma.result.create({ data: { tournamentId: t.id, participantId: userIds.get(h.phone)!, clientId: `seed-live-pending-${h.phone}`, speciesId: species[speciesFor[t.discipline][0]!]!, lengthMm: 470, markerCode: 'LIVE-01', status: 'PENDING_JUDGE', capturedAt: now, submittedAt: now } });
      const resub = await prisma.result.create({ data: { tournamentId: t.id, participantId: userIds.get('+79990000012')!, clientId: 'seed-live-resub', speciesId: species[speciesFor[t.discipline][0]!]!, lengthMm: 420, markerCode: 'LIVE-01', status: 'NEEDS_RESUBMISSION', capturedAt: now, submittedAt: now } });
      await prisma.judgeDecision.create({ data: { resultId: resub.id, judgeId: judge, decision: 'REQUEST_RESUBMISSION', reason: 'маркер нечёткий — переснимите с маркером в кадре' } });
    }
  }

  // ── проекция рейтинга из ledger
  {
    const rows = await prisma.rankingLedger.findMany({ where: { seasonId: season.id } });
    const totals = new Map<string, { points: number; starts: Set<string> }>();
    for (const r of rows) {
      const key = `${r.discipline}:${r.userId}`;
      const tt = totals.get(key) ?? { points: 0, starts: new Set<string>() };
      tt.points += Number(r.delta); if (r.tournamentId) tt.starts.add(r.tournamentId); totals.set(key, tt);
    }
    const byDisc = new Map<Discipline, Array<{ userId: string; points: number; starts: number }>>();
    for (const [key, tt] of totals) { const [d, userId] = key.split(':') as [Discipline, string]; byDisc.set(d, [...(byDisc.get(d) ?? []), { userId, points: tt.points, starts: tt.starts.size }]); }
    for (const [discipline, list] of byDisc) {
      list.sort((a, b) => b.points - a.points);
      await prisma.rankingEntry.createMany({ data: list.map((e, i) => ({ userId: e.userId, seasonId: season.id, discipline, points: e.points, rank: i + 1, starts: e.starts })) });
    }
  }

  // ── «мои» заявки на будущее: одна оплаченная личная и одна парная в ожидании напарника
  const open = await prisma.tournament.findMany({ where: { status: 'REGISTRATION_OPEN' }, orderBy: { startsAt: 'asc' }, take: 2 });
  for (const hero of HEROES) {
    const hid = userIds.get(hero)!;
    if (open[0] && !(await prisma.registration.findUnique({ where: { tournamentId_ownerId: { tournamentId: open[0].id, ownerId: hid } } }))) {
      const reg = await prisma.registration.create({ data: { tournamentId: open[0].id, ownerId: hid, format: 'SOLO', status: 'CONFIRMED', amountMinor: open[0].entryFeeMinor, idempotencyKey: `seed-${hero}-${open[0].slug}`, members: { create: { userId: hid, role: 'OWNER', invitationStatus: 'ACCEPTED', respondedAt: now } } } });
      await prisma.payment.create({ data: { registrationId: reg.id, provider: 'stub', status: 'SUCCEEDED', paidAt: now, amountMinor: open[0].entryFeeMinor ?? 0, idempotencyKey: `seed-pay-${reg.id}` } });
    }
    if (open[1] && !(await prisma.registration.findUnique({ where: { tournamentId_ownerId: { tournamentId: open[1].id, ownerId: hid } } }))) {
      await prisma.registration.create({ data: { tournamentId: open[1].id, ownerId: hid, format: 'PAIR', status: 'WAITING_MEMBERS', amountMinor: (open[1].entryFeeMinor ?? 0) * 2, idempotencyKey: `seed-${hero}-${open[1].slug}`, members: { create: [{ userId: hid, role: 'OWNER', invitationStatus: 'ACCEPTED', respondedAt: now }, { userId: userIds.get('+79990000008'), role: 'PARTNER', invitationStatus: 'PENDING' }] } } });
    }
  }

  // ── сообщество: каналы, участники, посты (тексты — из прототипа community-view / channel-view)
  {
    const CH: Array<{ slug: string; name: string; kind: 'OFFICIAL' | 'LOCAL'; city?: string; description: string; owner?: string; rubrics: string[] }> = [
      { slug: 'news', name: 'Синдикат · Новости', kind: 'OFFICIAL', description: 'Официальный канал лиги: анонсы стартов, протоколы, изменения регламентов.', rubrics: ['анонсы', 'протоколы'] },
      { slug: 'street-moscow', name: 'Стрит Москва', kind: 'LOCAL', city: 'Москва', description: 'Локальный канал стрит-сообщества Москвы: точки, снасти, отчёты и совместные выезды.', owner: '+79990000005', rubrics: ['водоёмы', 'снасти', 'отчёты', 'флудилка', 'турниры'] },
      { slug: 'feeder-mo', name: 'Фидер Подмосковье', kind: 'LOCAL', city: 'Московская область', description: 'Фидеристы Подмосковья: канал, водохранилища, платники.', owner: '+79990000010', rubrics: ['прикормка', 'сектора', 'отчёты'] },
      { slug: 'area-trout-club', name: 'Area Trout Club', kind: 'LOCAL', city: 'Москва', description: 'Форелевое сообщество: дуэльный формат, тренировки по средам, поиск напарников.', owner: '+79990000009', rubrics: ['приманки', 'тренировки', 'напарники'] },
    ];
    const chIds = new Map<string, string>();
    for (const c of CH) {
      const ch = await prisma.channel.upsert({ where: { slug: c.slug }, create: { slug: c.slug, name: c.name, kind: c.kind, city: c.city, description: c.description, ownerId: c.owner ? userIds.get(c.owner) : undefined, rubrics: { create: c.rubrics.map((name, i) => ({ name, sortOrder: i })) } }, update: {} });
      chIds.set(c.slug, ch.id);
      const memberPhones = c.kind === 'OFFICIAL' ? USERS.map((u) => u.phone) : USERS.filter((u) => rnd() < 0.7).map((u) => u.phone);
      for (const ph of new Set([...memberPhones, ...(c.owner ? [c.owner] : []), '+79990000002'])) {
        await prisma.channelMember.upsert({ where: { channelId_userId: { channelId: ch.id, userId: userIds.get(ph)! } }, create: { channelId: ch.id, userId: userIds.get(ph)!, role: ph === c.owner ? 'OWNER' : 'MEMBER' }, update: {} });
      }
    }
    const POSTS: Array<[string, string, string, string, string, number]> = [
      ['street-moscow', '+79990000004', 'водоёмы', 'Окунь снова у ближней бровки', 'После 18:30 начались короткие серии поклёвок. Прошёл от Воробьёвых до Андреевского: зелёный виброхвост 2", груз 3 грамма. Поклёвки сериями, рыба стоит на первой бровке.', 8],
      ['street-moscow', '+79990000005', 'турниры', 'Открытая тренировка в субботу', 'Встречаемся в 06:00 у Северного речного вокзала. Разберём поиск активной рыбы и фиксацию результата для турниров — берите линейку и телефон с приложением.', 34],
      ['street-moscow', '+79990000003', 'отчёты', 'Microjig Evening: как выиграл вечерний этап', 'Ставка на дальний заброс и паузы до 4 секунд. Пять окуней за последние 40 минут — все на тёмном силиконе. Разбор по точкам в комментариях.', 1440],
      ['street-moscow', '+79990000012', 'снасти', 'Комплект до 15 000 ₽ для новичка', 'Собираем проверенные варианты удилища, катушки и шнура. Что бы взяли сейчас на старт в стрите?', 2880],
      ['news', '+79990000001', 'анонсы', 'Регистрация на Shore Jig Major открыта', 'Пироговское водохранилище, 60 мест, личный и парный зачёт. Регламент опубликован в карточке турнира: 3 крупнейших судака/щуки, минимальные размеры 40/45 см.', 120],
      ['news', '+79990000001', 'протоколы', 'Итоги Street Species Sprint', 'Протокол опубликован, очки начислены в рейтинг сезона. Протесты не поступали. Спасибо судейской бригаде и площадке.', 4320],
      ['feeder-mo', '+79990000010', 'прикормка', 'Осенний лещ на канале: что работает', 'Тёмная прикормка, крупная фракция, ароматика минимальная. На последних тренировках лучший результат — на мотыля с опарышем.', 600],
      ['area-trout-club', '+79990000009', 'напарники', 'Ищем второго номера на осеннюю лигу', 'Нужен спортсмен с опытом Area Trout и возможностью тренироваться по средам. Рейтинг от 900 очков.', 42],
    ];
    {
      const REPLIES: Record<string, Array<[string, string]>> = {
        'Окунь снова у ближней бровки': [['+79990000003', 'Подтверждаю. У меня лучше сработал тёмный цвет на двух граммах.'], ['+79990000009', 'После 20:00 активность сместилась ближе к опоре моста, но рыба стала мельче.']],
        'Комплект до 15 000 ₽ для новичка': [['+79990000006', 'Crazy Fish Arion + Shimano Sedona 1000 + PE #0.3 — укладываешься с запасом.']],
      };
      for (const [slug, phone, rubric, title, text, minutesAgo] of POSTS) {
        const chId = chIds.get(slug)!;
        if (await prisma.post.findFirst({ where: { channelId: chId, title } })) continue;
        const r = await prisma.channelRubric.findFirst({ where: { channelId: chId, name: rubric } });
        const authorId = userIds.get(phone) ?? (await prisma.user.findUniqueOrThrow({ where: { phone } })).id;
        const post = await prisma.post.create({ data: { channelId: chId, authorId, rubricId: r?.id, title, text, createdAt: new Date(now.getTime() - minutesAgo * 60_000) } });
        const likers = USERS.filter((u) => u.phone !== phone && rnd() < 0.5).map((u) => userIds.get(u.phone)!);
        await prisma.postLike.createMany({ data: likers.map((userId) => ({ postId: post.id, userId })) });
        for (const [ph, t] of REPLIES[title] ?? []) await prisma.postComment.create({ data: { postId: post.id, authorId: userIds.get(ph)!, text: t, createdAt: new Date(post.createdAt.getTime() + 5 * 60_000) } });
      }
    }
  }

  // ── выезды и клубы (тексты — из прототипа)
  if ((await prisma.trip.count()) === 0) {
    const tomorrow = new Date(now.getTime() + 86_400_000); tomorrow.setUTCHours(16, 0, 0, 0);
    const sat = new Date(now.getTime() + ((6 - now.getUTCDay() + 7) % 7 || 7) * 86_400_000); sat.setUTCHours(2, 30, 0, 0);
    const sun = new Date(sat.getTime() + 86_400_000); sun.setUTCHours(4, 0, 0, 0);
    const trips = [
      { authorId: userIds.get('+79990000004')!, title: 'вечерний микроджиг на Москве-реке', place: 'Нескучный сад', startsAt: tomorrow, seats: 3, details: 'Лёгкая снасть, спокойный темп, новички тоже велкам. Встречаемся у главного входа.', discipline: 'STREET' as const },
      { authorId: userIds.get('+79990000010')!, title: 'фидерная тренировка перед Qualifier', place: 'Канал им. Москвы', startsAt: sat, seats: 2, details: 'Едем на двух машинах, есть одно место. Разберём закорм и дистанцию.', discipline: 'FEEDER' as const },
      { authorId: userIds.get('+79990000011')!, title: 'джиг по бровкам Пироговки', place: 'Пироговское вдхр.', startsAt: sun, seats: 3, details: 'Берег, свалы 6–9 м. Нужен джиг до 28 г.', discipline: 'SHORE_JIG' as const },
    ];
    for (const t of trips) {
      const trip = await prisma.trip.create({ data: t });
      if (t.title.startsWith('вечерний')) await prisma.tripMember.create({ data: { tripId: trip.id, userId: userIds.get('+79990000008')!, status: 'ACCEPTED' } });
    }
  }
  if ((await prisma.club.count()) === 0) {
    const clubs = [
      { slug: 'area-trout-club', name: 'Area Trout Club', city: 'Москва', discipline: 'AREA_TROUT' as const, recruiting: true, captain: '+79990000009', founded: 2024, description: 'Форелевый клуб: дуэли, тренировки по средам, выезды на платники.', athletes: ['+79990000013', '+79990000002'], slots: [{ title: 'спортсмен в основной состав', note: 'рейтинг от 900 · тренировки по средам' }, { title: 'контент-редактор', note: 'фото и отчёты с турниров' }] },
      { slug: 'river-crew', name: 'River Crew', city: 'Москва', discipline: 'STREET' as const, recruiting: false, captain: '+79990000003', founded: 2023, description: 'Стрит-команда Москвы-реки.', athletes: ['+79990000004', '+79990000005', '+79990000008'], slots: [] },
      { slug: 'feeder-family', name: 'Feeder Family', city: 'Подмосковье', discipline: 'FEEDER' as const, recruiting: true, captain: '+79990000010', founded: 2025, description: 'Фидер по каналу и водохранилищам, юниорская секция.', athletes: ['+79990000007'], slots: [{ title: 'юниор до 18 лет', note: 'обучение и стартовый взнос за счёт клуба' }] },
    ];
    for (const c of clubs) {
      await prisma.club.create({ data: { slug: c.slug, name: c.name, city: c.city, discipline: c.discipline, recruiting: c.recruiting, captainId: userIds.get(c.captain)!, foundedYear: c.founded, description: c.description, members: { create: [{ userId: userIds.get(c.captain)!, role: 'CAPTAIN' }, ...c.athletes.map((p) => ({ userId: userIds.get(p)!, role: 'ATHLETE' }))] }, slots: { create: c.slots } } });
    }
  }

  // ── уведомления для «меня»
  for (const hero of HEROES) {
    const me = userIds.get(hero)!;
    await prisma.notification.deleteMany({ where: { userId: me } });
    await prisma.notification.createMany({
      data: [
        { userId: me, kind: 'result.accepted', title: 'Судак 47 см отправлен судье', body: 'Shore Jig Qualifier: результат в очереди проверки.', createdAt: new Date(Date.now() - 4 * 60_000) },
        { userId: me, kind: 'tournament.reminder', title: 'Shore Jig Qualifier идёт сейчас', body: 'Маркер LIVE-01 · протесты 30 минут после финиша.', createdAt: new Date(Date.now() - 3 * 3_600_000) },
        { userId: me, kind: 'registration.confirmed', title: 'Заявка на River Walk Qualifier подтверждена', body: 'Стартовый номер выдадут на регистрации 24 июля.', readAt: new Date(), createdAt: new Date(Date.now() - 2 * 86_400_000) },
        { userId: me, kind: 'schedule.changed', title: 'Feeder Open: изменено время сбора', body: 'Регистрация с 06:30, старт тура 08:00.', readAt: new Date(), createdAt: new Date(Date.now() - 5 * 86_400_000) },
      ],
    });
  }

  const counts = await prisma.tournament.groupBy({ by: ['status'], _count: true });
  console.log(`demo ok: ${USERS.length} users · ${counts.map((c) => `${c.status}=${c._count}`).join(' ')} · вход: любой номер из seed-demo.ts, код 000000`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
