import "dotenv/config";
import { createBot } from "./bot.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig(process.env);
const bot = createBot(config);

console.info("Starting tg-moderator", {
  requiredChannelId: config.requiredChannelId,
  targetGroupId: config.targetGroupId ?? "any"
});

await bot.start();
