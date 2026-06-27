import { describe, expect, it } from "bun:test";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("loads the bot token and required channel id from environment variables", () => {
    expect(
      loadConfig({
        BOT_TOKEN: "123:abc",
        REQUIRED_CHANNEL_ID: "@my_channel"
      })
    ).toEqual({
      botToken: "123:abc",
      requiredChannelId: "@my_channel",
      targetGroupId: undefined
    });
  });

  it("throws a clear error when required environment variables are missing", () => {
    expect(() => loadConfig({})).toThrow("Missing required environment variables: BOT_TOKEN, REQUIRED_CHANNEL_ID");
  });

  it("loads an optional target group id as a number when it is numeric", () => {
    expect(
      loadConfig({
        BOT_TOKEN: "123:abc",
        REQUIRED_CHANNEL_ID: "@my_channel",
        TARGET_GROUP_ID: "-100100"
      }).targetGroupId
    ).toBe(-100100);
  });
});
