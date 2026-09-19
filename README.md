# Синдикат — рыболовная турнирная лига

Монорепо приложения лиги: мобильный клиент, web-кабинет и API. Продуктовая основа — [docs/concept-tournament-league.md](docs/concept-tournament-league.md), техническая — [docs/sindikat-technical-handoff.md](docs/sindikat-technical-handoff.md), UX — [docs/sindikat-community-prototype.html](docs/sindikat-community-prototype.html).

## Структура

```
apps/
  api/       NestJS 12 · модульный монолит · Prisma · PostgreSQL/PostGIS · SSE
  mobile/    Expo SDK 57 · expo-router · TanStack Query · участники
  web/       Next.js 16 · кабинет организатора / судьи / администратора
packages/
  domain/    общая доменная модель: enum'ы, статусные машины, формула рейтинга, zod-схемы DTO
infra/
  docker-compose.yml   Postgres+PostGIS (5433), Redis (6380), MinIO (9010/9011)
docs/        концепция, handoff, прототип, ADR
```

`@sindikat/domain` — единственный источник правды для статусов, коэффициентов и контрактов. API валидирует запросы теми же zod-схемами, которые клиенты используют для типов.

## Запуск

```bash
pnpm install
pnpm infra:up                      # docker compose
cp apps/api/.env.example apps/api/.env
pnpm --filter @sindikat/domain build
pnpm db:migrate                    # prisma migrate dev
pnpm --filter @sindikat/api db:seed
pnpm dev:api                       # http://localhost:3000/v1 · OpenAPI: /docs
pnpm dev:web                       # http://localhost:3001 (см. apps/web)
pnpm dev:mobile                    # Expo
```

## Демо-данные и вход

```bash
pnpm --filter @sindikat/api db:seed        # сезон 2027, 30 турниров, справочники, админ
pnpm --filter @sindikat/api db:seed:demo   # 13 участников, арсенал, трофеи, live-результаты, рейтинг
```

В dev любой номер входит с кодом **`000000`** (`OTP_DEV_CODE` в `.env`; реальные коды тоже пишутся в лог API).

| Номер | Кто | Где смотреть |
|---|---|---|
| `+79990000002` | **Алексей Смирнов** — «я» из прототипа: участник ~половины стартов своих дисциплин, в live-турнире на старте с номером, оплаченная заявка на ближайший старт и парная в ожидании напарника, 5 уловов (3 трофея), комплект, лодка, уведомления | приложение |
| `+79990000003` … `+79990000013` | остальные участники (Сафин, Крылов, Морозов, …) | приложение |
| `+79990000020` | Виктор Судейкин — судья Urban Street Open | кабинет → судейство (1 результат в очереди) |
| `+79990000001` | организатор + системный админ | CRM (http://localhost:3001): дашборд, турниры, рейтинг и правила, пользователи, справочники, аудит |

Календарь ведётся в текущем году (`SEASON_YEAR` в `prisma/seed.ts`; в концепции — 2027). Демо-seed расставляет статусы относительно сегодняшней даты: старты старше недели — `FINALIZED` с протоколами и очками сезона, текущей недели — `LIVE` (чек-ин, принятые результаты, очередь судьи, таймер до финиша ≈ 3 ч от запуска seed), будущие — `REGISTRATION_OPEN`. Seed воспроизводим: повторный запуск пересобирает все турнирные данные.

## Проверки

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Куда дальше

План этапов — handoff, раздел 14. Текущее состояние и открытые решения — [docs/DECISIONS.md](docs/DECISIONS.md), архитектура — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
