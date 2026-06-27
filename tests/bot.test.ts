import { describe, expect, it, mock } from "bun:test";
import { registerJoinRequestHandler } from "@/bot";

function fakeBot() {
  const handlers: Array<(ctx: Parameters<Parameters<typeof registerJoinRequestHandler>[0]["on"]>[1] extends (ctx: infer Ctx) => Promise<void> ? Ctx : never) => Promise<void>> = [];

  const bot: Parameters<typeof registerJoinRequestHandler>[0] = {
    on: mock((_updateType, handler) => {
      handlers.push(handler);
    })
  };

  return { bot, handlers };
}

describe("registerJoinRequestHandler", () => {
  it("registers a chat_join_request handler that moderates the applicant from the grammY context", async () => {
    const { bot, handlers } = fakeBot();
    const api = {
      getChatMember: mock().mockResolvedValue({ status: "member" }),
      approveChatJoinRequest: mock().mockResolvedValue(true)
    };

    registerJoinRequestHandler(bot, {
      requiredChannelId: "@my_channel",
      targetGroupId: -100100
    });

    expect(bot.on).toHaveBeenCalledWith("chat_join_request", expect.any(Function));

    const handler = handlers[0]!;
    await handler({
      api,
      chatJoinRequest: {
        chat: { id: -100100 },
        from: { id: 42 }
      }
    });

    expect(api.getChatMember).toHaveBeenCalledWith("@my_channel", 42);
    expect(api.approveChatJoinRequest).toHaveBeenCalledWith(-100100, 42);
  });
});
