# telegram-join-moderator

Простой Telegram-бот на TypeScript + grammY: принимает заявки в группу только от пользователей, которые уже подписаны на обязательный канал.

## Логика

1. Пользователь отправляет заявку на вступление в группу.
2. Бот получает `chat_join_request`.
3. Бот проверяет `getChatMember(REQUIRED_CHANNEL_ID, user_id)`.
4. Если статус `member`, `administrator` или `creator` — вызывает `approveChatJoinRequest`.
5. Если статус `left`, `kicked`, `restricted` или Telegram отвечает `Bad Request: user not found` — вызывает `declineChatJoinRequest`.
6. Если проверка канала падает по другой причине, бот не апрувит и не отклоняет заявку, чтобы не банить людей из-за misconfig.

## Права в Telegram

### В группе

- Добавить бота админом.
- Дать право добавлять пользователей / управлять инвайтами (`can_invite_users`).
- Включить заявки на вступление.

### В канале

- Добавить бота админом, чтобы он мог проверять подписку через `getChatMember`.

## Настройка

```bash
cp .env.example .env
npm install
npm test
npm run typecheck
npm start
```

`.env`:

```bash
BOT_TOKEN=123456:replace_me
REQUIRED_CHANNEL_ID=@your_channel
TARGET_GROUP_ID=-1001234567890
```

`TARGET_GROUP_ID` опционален, но лучше задать, чтобы бот не модерировал случайную группу, куда его добавили.

## Разработка

```bash
npm test          # все тесты
npm run typecheck # проверка TypeScript
npm run build     # сборка в dist/
npm run dev       # запуск в watch-режиме
```

## Структура

```text
src/
  bot.ts            # grammY adapter: регистрирует chat_join_request handler
  config.ts         # env config parser
  index.ts          # runtime entrypoint
  join-moderator.ts # orchestration: lookup -> approve/decline
  join-policy.ts    # чистая политика статусов

tests/
  bot.test.ts
  config.test.ts
  join-moderator.test.ts
  join-policy.test.ts
```
