export type TelegramChatId = string | number;

export type AppConfig = {
  botToken: string;
  requiredChannelId: TelegramChatId;
  targetGroupId?: TelegramChatId;
};

function parseChatId(value: string | undefined): TelegramChatId | undefined {
  if (!value) {
    return undefined;
  }

  return /^-?\d+$/.test(value) ? Number(value) : value;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const missing = ["BOT_TOKEN", "REQUIRED_CHANNEL_ID"].filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    botToken: env.BOT_TOKEN!,
    requiredChannelId: parseChatId(env.REQUIRED_CHANNEL_ID)!,
    targetGroupId: parseChatId(env.TARGET_GROUP_ID)
  };
}
