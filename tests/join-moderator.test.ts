import { describe, expect, it, mock } from "bun:test";
import { moderateJoinRequest } from "../src/join-moderator";

function fakeApi(status: "member" | "administrator" | "creator" | "left" | "kicked" | "restricted") {
  return {
    getChatMember: mock().mockResolvedValue({ status }),
    approveChatJoinRequest: mock().mockResolvedValue(true)
  };
}

function fakeApiWithLookupError(error: unknown) {
  return {
    getChatMember: mock().mockRejectedValue(error),
    approveChatJoinRequest: mock().mockResolvedValue(true)
  };
}

describe("moderateJoinRequest", () => {
  it("approves a group join request when the applicant is subscribed to the required channel", async () => {
    const api = fakeApi("member");

    await expect(
      moderateJoinRequest({
        api,
        requiredChannelId: "@my_channel",
        request: { chatId: -100100, userId: 42 }
      })
    ).resolves.toEqual({ action: "approve", channelStatus: "member" });

    expect(api.getChatMember).toHaveBeenCalledWith("@my_channel", 42);
    expect(api.approveChatJoinRequest).toHaveBeenCalledWith(-100100, 42);
  });

  it("leaves a group join request pending when the applicant is not subscribed to the required channel", async () => {
    const api = fakeApi("left");

    await expect(
      moderateJoinRequest({
        api,
        requiredChannelId: "@my_channel",
        request: { chatId: -100100, userId: 42 }
      })
    ).resolves.toEqual({ action: "ignore", reason: "not_subscribed", channelStatus: "left" });

    expect(api.getChatMember).toHaveBeenCalledWith("@my_channel", 42);
    expect(api.approveChatJoinRequest).not.toHaveBeenCalled();
  });

  it("leaves a group join request pending when Telegram says the applicant was not found in the channel", async () => {
    const api = fakeApiWithLookupError({
      error_code: 400,
      description: "Bad Request: user not found"
    });

    await expect(
      moderateJoinRequest({
        api,
        requiredChannelId: "@my_channel",
        request: { chatId: -100100, userId: 42 }
      })
    ).resolves.toEqual({ action: "ignore", reason: "not_subscribed", channelStatus: "left", lookupError: "user_not_found" });

    expect(api.getChatMember).toHaveBeenCalledWith("@my_channel", 42);
    expect(api.approveChatJoinRequest).not.toHaveBeenCalled();
  });

  it("does not approve when the channel membership lookup fails for a reason other than missing user", async () => {
    const error = { error_code: 403, description: "Forbidden: bot is not a member of the channel chat" };
    const api = fakeApiWithLookupError(error);

    await expect(
      moderateJoinRequest({
        api,
        requiredChannelId: "@my_channel",
        request: { chatId: -100100, userId: 42 }
      })
    ).rejects.toBe(error);

    expect(api.approveChatJoinRequest).not.toHaveBeenCalled();
  });

  it("ignores join requests from other groups when a target group is configured", async () => {
    const api = fakeApi("member");

    await expect(
      moderateJoinRequest({
        api,
        requiredChannelId: "@my_channel",
        targetGroupId: -100999,
        request: { chatId: -100100, userId: 42 }
      })
    ).resolves.toEqual({ action: "ignore", reason: "wrong_chat" });

    expect(api.getChatMember).not.toHaveBeenCalled();
    expect(api.approveChatJoinRequest).not.toHaveBeenCalled();
  });
});
