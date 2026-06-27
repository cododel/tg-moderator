import "dotenv/config";
import { createBot } from "./bot.js";
import { loadConfig } from "./config.js";

const config = loadConfig(process.env);
const bot = createBot(config);

console.info("Starting tg-moderator", {
  requiredChannelId: config.requiredChannelId,
  targetGroupId: config.targetGroupId ?? "any"
});

await bot.start();
