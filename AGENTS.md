# tg-moderator

Бот модерации заявок в Telegram: проверяет подписку на канал через `getChatMember`.

## Стек
- **Runtime:** Bun 1.3.14 (native TS, без tsc-сборки)
- **Фреймворк:** grammY ^1.44
- **Тесты:** bun:test (встроенный, 15 тестов, 4 файла)
- **Алиасы:** `@/` → `src/`

## Запуск
```bash
bun run start:prod   # = bun src/index.ts
bun run dev          # bun --watch src/index.ts
bun run test         # bun test
bun run typecheck    # tsc --noEmit
```

## Переменные
| Переменная | Назначение |
|---|---|
| `BOT_TOKEN` | Токен от @BotFather |
| `REQUIRED_CHANNEL_ID` | Канал, подписку на который проверяем |
| `TARGET_GROUP_ID` | Группа, в которой работаем (опционально, но рекомендуется) |

## Структура
```
src/
  index.ts           # entrypoint
  config.ts          # env-парсер
  bot.ts             # grammY-адаптер: хендлеры join_request + welcome
  join-moderator.ts  # оркестрация: lookup → decide → approve
  join-policy.ts     # чистая функция: статус → решение
tests/
  config.test.ts
  join-policy.test.ts
  join-moderator.test.ts
  bot.test.ts
```

## Ключевые решения
- `restricted` статус канала = подписан (аппрув)
- `user not found` → заявка остаётся висеть (fail-safe)
- При прочих ошибках API → заявка висеть
- Зааппрувленные юзеры трекаются 60с в Set для реакции 🤝

## Docker
```bash
docker build -t tg-moderator .
docker run --rm --env-file .env tg-moderator
```
Multi-stage: deps → build (test+typecheck) → prod-deps → runtime (bun, non-root).
