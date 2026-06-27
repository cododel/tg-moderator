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
bun install
bun run test
bun run typecheck
bun run start
```

`.env`:

```bash
BOT_TOKEN=123456:replace_me
REQUIRED_CHANNEL_ID=@your_channel
TARGET_GROUP_ID=-1001234567890
```

`TARGET_GROUP_ID` опционален, но лучше задать, чтобы бот не модерировал случайную группу, куда его добавили. ID группы в Telegram всегда с префиксом `-100` для супергрупп (например `-1000000000000`, а не `1234567890`).

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
