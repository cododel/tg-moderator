import { Bot } from "grammy";
import type { AppConfig } from "./config.js";
import { moderateJoinRequest, type JoinModerationApi } from "./join-moderator.js";

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

export function registerJoinRequestHandler(
  bot: JoinRequestBot,
  config: Pick<AppConfig, "requiredChannelId" | "targetGroupId">
): void {
  bot.on("chat_join_request", async (ctx) => {
    await moderateJoinRequest({
      api: ctx.api,
      requiredChannelId: config.requiredChannelId,
      targetGroupId: config.targetGroupId,
      request: {
        chatId: ctx.chatJoinRequest.chat.id,
        userId: ctx.chatJoinRequest.from.id
      }
    });
  });
}

export function createBot(config: AppConfig): Bot {
  const bot = new Bot(config.botToken);
  registerJoinRequestHandler(bot as unknown as JoinRequestBot, config);
  return bot;
}
