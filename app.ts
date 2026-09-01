import { createChatAgent } from "./src/agents/chat";
import { DiscordProvider } from "./src/providers/discord";
import { loadTranslationConfig } from "./src/config/translation";
import type { ChatContext } from "./src/types/provider";

await loadTranslationConfig();

const provider = new DiscordProvider({
    token: Bun.env.DISCORD_BOT_TOKEN || "",
    presence: Bun.env.DISCORD_PRESENCE || "Chief Translator",
});

provider.onMessage(async (ctx: ChatContext) => {
    const agent = await createChatAgent();
    const reply = await agent.replyMessage(ctx);
    await ctx.reply(reply);
});

provider.onCommand(async (_command, _args, ctx) => {
    await ctx.reply("Command is not implemented yet.");
});

await provider.start();
console.info("[Liscia] Discord translation bot started");

const shutdown = async () => {
    console.info("[Liscia] Shutting down...");
    await provider.stop();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
