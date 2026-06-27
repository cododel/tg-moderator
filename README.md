# tg-moderator

Простой Telegram-бот на TypeScript + grammY: принимает заявки в группу только от пользователей, которые уже подписаны на обязательный канал.

## Логика

1. Пользователь отправляет заявку на вступление в группу.
2. Бот получает `chat_join_request`.
3. Бот проверяет `getChatMember(REQUIRED_CHANNEL_ID, user_id)`.
4. Если статус `member`, `administrator` или `creator` — вызывает `approveChatJoinRequest`.
5. Если статус `left`, `kicked`, `restricted` или Telegram отвечает `Bad Request: user not found` — ничего не делает, заявка остается висеть в pending.
6. Если проверка канала падает по другой причине, бот тоже ничего не делает с заявкой: это fail-safe против случайного апрува при misconfig.

## Права в Telegram

### В группе

- Добавить бота админом.
- Дать право добавлять пользователей / управлять инвайтами (`can_invite_users`).
- Включить заявки на вступление.

### В канале

- Добавить бота админом, чтобы он мог проверять подписку через `getChatMember`.

## Настройка

Требуется Bun `1.3.14+`.

```bash
cp .env.example .env
# отредактируй .env — вставь токен из @BotFather и id канала/группы
bun install
bun run test
bun run typecheck
bun run start
```

### Как получить ID группы и канала

Telegram в интерфейсе показывает ID без префикса. **Настоящий ID всегда с `-100`:**

| Где взять | Что видишь | Что писать в .env |
|---|---|---|
| Web-клиент → группа → URL | `1234567890` | `-1001234567890` |
| Web-клиент → канал → URL | `9876543210` | `-1009876543210` |

Проще всего не гадать, а использовать `@username`:
- Канал: `REQUIRED_CHANNEL_ID=@your_channel` (если есть username)
- Группа: `TARGET_GROUP_ID=-100<id>` (обязательно найти точный id через API)

### `.env` после заполнения

```bash
BOT_TOKEN=12345:ABC...xyz
REQUIRED_CHANNEL_ID=@your_channel
TARGET_GROUP_ID=-1001234567890
```

## Docker / Bun runtime

Образ собирается на `oven/bun` в multi-stage режиме:

- `deps` — ставит все зависимости по `bun.lock`;
- `build` — гоняет `bun run test`, `bun run typecheck`, `bun run build`;
- `prod-deps` — ставит только production dependencies;
- `runtime` — запускает compiled JS под Bun от non-root пользователя `bun`.

```bash
docker build -t tg-moderator:local .

docker run --rm \
  --env-file .env \
  tg-moderator:local
```

Переменные окружения не копируются в образ, только передаются на запуске через `--env-file` / secrets.

## Разработка

```bash
bun run test      # все тесты
bun run typecheck # проверка TypeScript
bun run build     # сборка в dist/
bun run dev       # запуск в watch-режиме
```

## Структура

```text
src/
  bot.ts            # grammY adapter: регистрирует chat_join_request handler
  config.ts         # env config parser
  index.ts          # runtime entrypoint
  join-moderator.ts # orchestration: lookup -> approve/keep pending
  join-policy.ts    # чистая политика статусов

tests/
  bot.test.ts
  config.test.ts
  join-moderator.test.ts
  join-policy.test.ts
```
