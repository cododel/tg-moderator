import { Bot, type Context } from "grammy";
import type { AppConfig } from "./config";
import { moderateJoinRequest, type JoinModerationApi } from "./join-moderator";

type ChatJoinRequestContext = {
  api: JoinModerationApi;
  chatJoinRequest: {
    chat: { id: string | number };
    from: { id: number };
  };
};

type JoinRequestBot = {
  on(updateType: "chat_join_request", handler: (ctx: ChatJoinRequestContext) => Promise<void>): unknown;
};

/** Track recently approved user IDs so we can react with 🤝 when they appear. */
const approvedUsers = new Set<number>();
/** Clean up stale entries after 60 seconds — the service message arrives within 1–2s. */
const APPROVED_TTL_MS = 60_000;

export function registerJoinRequestHandler(
  bot: JoinRequestBot,
  config: Pick<AppConfig, "requiredChannelId" | "targetGroupId">
): void {
  bot.on("chat_join_request", async (ctx) => {
    const result = await moderateJoinRequest({
      api: ctx.api,
      requiredChannelId: config.requiredChannelId,
      targetGroupId: config.targetGroupId,
      request: {
        chatId: ctx.chatJoinRequest.chat.id,
        userId: ctx.chatJoinRequest.from.id
      }
    });

    if (result.action === "approve") {
      approvedUsers.add(ctx.chatJoinRequest.from.id);
      setTimeout(() => approvedUsers.delete(ctx.chatJoinRequest.from.id), APPROVED_TTL_MS);
    }
  });
}

export function registerWelcomeReaction(bot: Bot, config: Pick<AppConfig, "targetGroupId">): void {
  bot.on("message:new_chat_members", async (ctx: Context) => {
    // Only react in the target group (if configured)
    if (config.targetGroupId !== undefined && ctx.chat?.id !== config.targetGroupId) {
      return;
    }

    const newMembers = ctx.message?.new_chat_members;
    if (!newMembers || newMembers.length === 0) return;

    for (const member of newMembers) {
      if (approvedUsers.has(member.id)) {
        await ctx.react("🤝").catch(() => {
          // Ignore — reaction may fail if bot lacks rights or message is too old
        });
        approvedUsers.delete(member.id);
        break; // One reaction per service message is enough
      }
    }
  });
}

export function createBot(config: AppConfig): Bot {
  const bot = new Bot(config.botToken);
  registerJoinRequestHandler(bot as unknown as JoinRequestBot, config);
  registerWelcomeReaction(bot, config);
  return bot;
}
