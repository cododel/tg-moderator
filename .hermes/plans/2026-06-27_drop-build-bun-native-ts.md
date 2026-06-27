# Drop tsc build — Bun native TypeScript runtime

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Убрать `tsc`-сборку (`dist/`), перевести прод-рантайм на `bun src/index.ts`. Попутно исправить `restricted` → аппрув и добавить structured logging.

**Architecture:** Bun транспилирует TypeScript на лету. Убираем `tsconfig.build.json`, скрипт `build`, `dist/` из `.gitignore`/`.dockerignore`. Меняем `start:prod` на `bun src/index.ts`, Dockerfile — копировать `src/` вместо `dist/`. Стадия `build` в Docker остаётся для тестов и typecheck, но без `RUN bun run build`.

**Tech Stack:** Bun 1.3.14, TypeScript 6, grammY, Vitest. Без `tsx` в проде.

---

### Task 1: `restricted` → approve в join-policy

**Objective:** Исправить баг: `restricted` означает «в канале, но с ограничениями» → должен аппрувиться.

**Files:**
- Modify: `src/join-policy.ts:8`
- Test: `tests/join-policy.test.ts:5`

**Step 1: Добавить `restricted` в allowed statuses в тесте**

В `tests/join-policy.test.ts`, строка 5: заменить
```ts
const allowedStatuses = ["member", "administrator", "creator"] as const;
```
на
```ts
const allowedStatuses = ["member", "administrator", "creator", "restricted"] as const;
```

И удалить `"restricted"` из `pendingStatuses` на строке 5 (или оставить пустым — сейчас там `["left", "kicked", "restricted"]`, убрать `"restricted"`):
```ts
const pendingStatuses = ["left", "kicked"] as const;
```

**Step 2: Запустить тесты — должны упасть**

```bash
bun run test
```
Ожидаемо: 2 теста упадут — `restricted` теперь в allowed, но реализация ещё не обновлена.

**Step 3: Поправить `decideJoinRequest`**

В `src/join-policy.ts:8`, заменить:
```ts
if (["member", "administrator", "creator"].includes(member.status)) {
```
на
```ts
if (["member", "administrator", "creator", "restricted"].includes(member.status)) {
```

**Step 4: Запустить тесты — должны пройти**

```bash
bun run test
```
Ожидаемо: все 15 тестов зелёные (2 теста для `restricted` теперь в allowed-группе).

**Step 5: Commit**

```bash
git add src/join-policy.ts tests/join-policy.test.ts
git commit -m "fix: treat restricted channel status as subscribed"
```

---

### Task 2: Structured logging в moderateJoinRequest

**Objective:** Добавить `console.info` с результатом модерации для продакшен-наблюдаемости.

**Files:**
- Modify: `src/join-moderator.ts:36-67`

**Step 1: Добавить логирование после принятия решения**

В `src/join-moderator.ts`, перед `return` в функции `moderateJoinRequest` (строка 66), добавить:

```ts
console.info("moderateJoinRequest", {
  userId: request.userId,
  chatId: request.chatId,
  action: decision.action,
  reason: "reason" in decision ? decision.reason : undefined,
  channelStatus: member.status,
  lookupError
});
```

**Важно:** это должно быть ДО `return` на строке 66 и ПОСЛЕ вычисления `decision` (строка 60). Логирование — side-effect, не меняет логику. Не нужен отдельный тест на логи.

**Step 2: Проверить что тесты всё ещё проходят**

```bash
bun run test
```
Ожидаемо: 15 passed (логирование не ломает тесты).

**Step 3: Commit**

```bash
git add src/join-moderator.ts
git commit -m "feat: add structured logging for join request decisions"
```

---

### Task 3: Обновить `package.json` — убрать build, сменить start:prod

**Objective:** `start:prod` теперь `bun src/index.ts`, скрипт `build` удалён, `main` указывает на TS-вход.

**Files:**
- Modify: `package.json`

**Step 1: Заменить скрипты**

В `package.json` заменить:

```json
"main": "dist/index.js",
```
на
```json
"main": "src/index.ts",
```

```json
"start:prod": "bun dist/src/index.js",
```
на
```json
"start:prod": "bun src/index.ts",
```

Удалить строку:
```json
"build": "rm -rf dist && tsc -p tsconfig.build.json",
```

**Step 2: Проверить что `bun run start` (tsx) всё ещё работает**

```bash
bun run start &
sleep 2
kill %1 2>/dev/null
```
Ожидаемо: бот стартует (упадёт без .env с читаемой ошибкой).

**Step 3: Проверить что `bun run start:prod` работает без dist/**

```bash
rm -rf dist
bun run start:prod
```
Ожидаемо: ошибка «Missing required environment variables» (бот запустился, просто без .env), НЕ «Cannot find module».

**Step 4: Commit**

```bash
git add package.json
git commit -m "refactor: switch to Bun native TS runtime, drop tsc build"
```

---

### Task 4: Удалить `tsconfig.build.json` и `dist/` из игноров

**Objective:** `tsconfig.build.json` больше не нужен. `dist/` больше не генерируется — убрать из `.gitignore` и `.dockerignore`.

**Files:**
- Delete: `tsconfig.build.json`
- Modify: `.gitignore:2`
- Modify: `.dockerignore:7`

**Step 1: Удалить tsconfig.build.json**

```bash
rm tsconfig.build.json
```

**Step 2: Убрать `dist/` из `.gitignore`**

В `.gitignore` удалить строку 2 (`dist/`).

**Step 3: Убрать `dist/` из `.dockerignore`**

В `.dockerignore` удалить строку 7 (`dist`).

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove tsconfig.build.json, drop dist from ignore files"
```

---

### Task 5: Переписать Dockerfile под `bun src/index.ts`

**Objective:** Рантайм-стадия копирует `src/` вместо `dist/`. Стадия build больше не делает `bun run build`. Всё остальное — тесты, typecheck, prod-deps — остаётся.

**Files:**
- Modify: `Dockerfile`

**Шаг 1: В стадии `build` убрать `RUN bun run build`**

Удалить строку 18:
```dockerfile
RUN bun run build
```

**Шаг 2: В стадии `runtime` копировать `src/` вместо `dist/`**

Заменить строку 31:
```dockerfile
COPY --from=build --chown=bun:bun /app/dist ./dist
```
на
```dockerfile
COPY --from=build --chown=bun:bun /app/src ./src
COPY --from=build --chown=bun:bun /app/tsconfig.json ./tsconfig.json
```

(`tsconfig.json` нужен Bun для `paths`/`moduleResolution`, даже без `tsc`)

**Шаг 3: Обновить CMD если нужно**

`CMD ["bun", "run", "start:prod"]` уже вызывает `bun src/index.ts` (после Task 3) — менять не надо.

**Итоговый Dockerfile:**

```dockerfile
# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.3.14
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app
ENV CI=true

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json vitest.config.ts ./
COPY src ./src
COPY tests ./tests
RUN bun run test
RUN bun run typecheck

FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS runtime
ENV NODE_ENV=production
STOPSIGNAL SIGTERM
USER bun
COPY --from=prod-deps --chown=bun:bun /app/package.json ./package.json
COPY --from=prod-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/src ./src
COPY --from=build --chown=bun:bun /app/tsconfig.json ./tsconfig.json
CMD ["bun", "run", "start:prod"]
```

**Шаг 4: Собрать и проверить образ**

```bash
docker build --no-cache -t tg-moderator:native-ts .
docker run --rm --entrypoint sh tg-moderator:native-ts -c \
  'id && test -f src/index.ts && test ! -d dist && bun --version'
```
Ожидаемо: `uid=1000(bun)`, `src/index.ts` на месте, `dist/` нет.

**Шаг 5: Smoke-test без .env**

```bash
docker run --rm tg-moderator:native-ts
```
Ожидаемо: ошибка «Missing required environment variables: BOT_TOKEN, REQUIRED_CHANNEL_ID» (НЕ «Cannot find module»).

**Шаг 6: Commit**

```bash
git add Dockerfile
git commit -m "refactor: Dockerfile copies src/ instead of dist/, drop build stage"
```

---

### Task 6: Обновить README

**Objective:** Убрать упоминания `dist/`, `tsc build`, отразить что бот работает напрямую из TS.

**Files:**
- Modify: `README.md`

**Шаг 1: Поправить секцию «Разработка»**

Убрать `bun run build` из списка команд (строка 85):
```markdown
bun run test      # все тесты
bun run typecheck # проверка TypeScript
bun run dev       # запуск в watch-режиме
```

**Шаг 2: Поправить секцию «Docker / Bun runtime»**

Заменить:
```markdown
- `build` — гоняет `bun run test`, `bun run typecheck`, `bun run build`;
- `runtime` — запускает compiled JS под Bun от non-root пользователя `bun`.
```
на:
```markdown
- `build` — гоняет `bun run test`, `bun run typecheck`;
- `runtime` — запускает TypeScript напрямую через Bun от non-root пользователя `bun`.
```

**Шаг 3: Commit**

```bash
git add README.md
git commit -m "docs: update README for Bun native TS runtime"
```

---

### Task 7: Финальная проверка

**Objective:** Полный прогон — тесты, typecheck, Docker build, Docker run.

**Step 1: Тесты**

```bash
bun run test
```
Ожидаемо: 15 passed.

**Step 2: Typecheck**

```bash
bun run typecheck
```
Ожидаемо: чисто.

**Step 3: Docker build**

```bash
docker build --no-cache -t tg-moderator:final .
```
Ожидаемо: build succeeds, все стадии зелёные.

**Step 4: Docker run smoke**

```bash
docker run --rm tg-moderator:final
```
Ожидаемо: ошибка Missing env vars (читаемая), не module crash.

**Step 5: Итоговый commit (если были правки)**

```bash
git add -A
git commit -m "chore: final verification after dropping tsc build"
```

---

## Сводка изменений

| Файл | Изменение |
|---|---|
| `src/join-policy.ts` | `restricted` → approve |
| `src/join-moderator.ts` | +structured logging |
| `tests/join-policy.test.ts` | `restricted` → allowed |
| `package.json` | –build, start:prod → `bun src/index.ts`, main → `src/index.ts` |
| `tsconfig.build.json` | **удалён** |
| `.gitignore` | –dist/ |
| `.dockerignore` | –dist |
| `Dockerfile` | COPY src/ вместо dist/, –RUN bun run build |
| `README.md` | убрать упоминания сборки |

**Risks:**
- `tsconfig.json` копируется в рантайм-образ: +426 байт, нужно только для `paths`/`moduleResolution` в Bun
- Bun transpile на старте: +50-200ms, для long-lived бота неважно
- Если граммовские типы сломаются на Bun-транспиляции (маловероятно, Bun 1.3.14 зрелый): откат тривиален — вернуть `tsc`
