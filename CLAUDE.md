# Синдикат — правила для работы в репозитории

## Что это
Рыболовная турнирная лига: Expo-клиент, Next.js-кабинет, NestJS API. Продукт и требования — `docs/`. Handoff (`docs/sindikat-technical-handoff.md`) — первичный источник по сущностям, статусам, API и границе MVP; при расхождении кода и handoff — уточнять, а не молча менять.

## Инварианты (не нарушать)
- Коэффициенты рейтинга (×1 / ×1,25 / ×2 / ×3) не хардкодятся — только `ranking_rules` (handoff §10). Спор Qualifier ×1 vs ×1,25 не решён (DECISIONS.md #1).
- Статусы турнира/заявки/результата меняются только через машины из `@sindikat/domain/state-machines`.
- Рейтинг — проекция `ranking_ledger`; правки очков — новая запись ledger, не UPDATE.
- После `FINALIZED` результат меняется только через `result_corrections`.
- Точная координата улова не попадает в публичные DTO при `WATERBODY_ONLY` / `HIDDEN`; документы лодки — только владельцу и организатору лодочного турнира.
- Права проверяет backend (`RolesGuard`); скрытая кнопка в клиенте — не защита.
- Деньги — целые в копейках; даты — UTC, зона события отдельно.
- Изменяющие запросы регистрации/оплаты/результата требуют `Idempotency-Key`.

## Как устроен код
- Домены API в `apps/api/src/modules/*`; модуль не лезет в таблицы соседа — только через его сервис.
- DTO и валидация: zod-схемы в `packages/domain/src/schemas`, в контроллерах — `@ZodBody()` / `@ZodQuery()`.
- Prisma-схема: `apps/api/prisma/schema.prisma`; PostGIS-поля через `Unsupported`, пишутся raw-SQL.
- Мобильные экраны — `apps/mobile/app/*` (expo-router), доменная логика — `apps/mobile/src/features/*`.
- ESM везде: относительные импорты с `.js` в `api` и `domain`.

## Команды
`pnpm typecheck` · `pnpm test` · `pnpm build` · `pnpm db:migrate` · `pnpm --filter @sindikat/api db:seed`.
После правки `packages/domain` — `pnpm --filter @sindikat/domain build` (api и web читают `dist/`).
Docker-порты сдвинуты (5433/6380/9010): на машине есть другие проекты.
Сезон в seed — текущий год (`SEASON_YEAR`), статусы турниров demo-seed расставляет от сегодняшней даты; не хардкодить год в UI (см. `SEASON_YEAR` в mobile helpers).

## Стиль
Комментарии и тексты интерфейса — по-русски; идентификаторы — по-английски. Ссылки на разделы handoff в комментариях приветствуются (`handoff §7.3`).
