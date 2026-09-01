import {
    Client,
    GatewayIntentBits,
    Partials,
    Events,
    PresenceUpdateStatus,
    ActivityType,
} from "discord.js";
import { PlatformName } from "../types/provider";
import type {
    BasePlatformProvider,
    MessageCallback,
    CommandCallback,
    ChatContext,
} from "../types/provider";
import type { DiscordProviderParams } from "../types/discord";
import { sliceContent } from "../utils/text";
import { getTranslationConfig, getChannelLocales } from "../config/translation";

export class DiscordProvider implements BasePlatformProvider {
    readonly name: PlatformName = PlatformName.Discord;
    readonly enabled: boolean;

    #token: string;
    #presence: string;
    #client: Client | null = null;
    #messageCallbacks: MessageCallback[] = [];
    #commandCallbacks: CommandCallback[] = [];

    constructor(params: DiscordProviderParams) {
        this.#token = params.token;
        this.#presence = params.presence || "Chief Translator";
        this.enabled = this.#token !== "";
    }

    async start(): Promise<void> {
        if (!this.enabled) return;
        if (this.#client) return;

        const client = new Client({
            partials: [Partials.Channel, Partials.Message],
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        client.on(Events.ClientReady, () => {
            console.info(`[DiscordProvider] Logged in as ${client.user?.tag}`);
            client.user?.setPresence({
                status: PresenceUpdateStatus.Online,
                activities: [{ type: ActivityType.Playing, name: this.#presence }],
            });
        });

        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return;

            const channelId = message.channel.id;
            const guildId = message.guild?.id;
            const config = getTranslationConfig();
            const channelLocales = getChannelLocales(channelId, config);

            const isConfiguredChannel = Boolean(channelLocales && channelLocales.length > 0);
            const isDirectMessage = !message.guild;
            const isMentioned = client.user ? message.mentions.users.has(client.user.id) : false;

            if (!isConfiguredChannel && !isDirectMessage && !isMentioned) return;

            let cleanContent = message.content;
            if (client.user && isMentioned) {
                const mentionRegex = new RegExp(`<@!?${client.user.id}>`, "g");
                cleanContent = cleanContent.replace(mentionRegex, "").trim();
            } else {
                cleanContent = cleanContent.trim();
            }

            if (!cleanContent) return;

            if (message.channel.isSendable()) {
                await message.channel.sendTyping().catch((err) => {
                    console.warn("[DiscordProvider] Failed to send typing indicator:", err);
                });
            }

            const ctx: ChatContext = {
                platformName: PlatformName.Discord,
                roomId: channelId,
                guildId,
                locales: channelLocales || config.defaultLocales,
                sender: {
                    id: message.author.id,
                    nickname: message.member?.displayName ?? message.author.displayName ?? message.author.username,
                    username: message.author.username,
                },
                content: cleanContent,
                reply: async (text: string) => {
                    const chunks = sliceContent(text, 2000);
                    for (const chunk of chunks) {
                        try {
                            await message.reply({
                                content: chunk,
                                allowedMentions: { repliedUser: false },
                            });
                        } catch {
                            await this.sendText(message.channel.id, chunk);
                        }
                    }
                },
            };

            for (const cb of this.#messageCallbacks) {
                try {
                    await cb(ctx);
                } catch (error) {
                    console.error("[DiscordProvider] Error executing message callback:", error);
                }
            }
        });

        this.#client = client;
        await client.login(this.#token);
    }

    async stop(): Promise<void> {
        if (this.#client) {
            await this.#client.destroy();
            this.#client = null;
        }
    }

    onMessage(cb: MessageCallback): void {
        this.#messageCallbacks.push(cb);
    }

    onCommand(cb: CommandCallback): void {
        this.#commandCallbacks.push(cb);
    }

    async sendText(roomId: string, content: string): Promise<void> {
        if (!this.enabled) {
            console.warn("[DiscordProvider] Cannot send text: Provider is disabled");
            return;
        }
        if (!this.#client) {
            console.warn("[DiscordProvider] Cannot send text: Discord client is not initialized");
            return;
        }

        const channel = await this.#client.channels.fetch(roomId).catch((err) => {
            console.error(`[DiscordProvider] Failed to fetch channel ${roomId}:`, err);
            return null;
        });
        if (!channel) {
            console.error(`[DiscordProvider] Channel ${roomId} not found`);
            return;
        }
        if (!channel.isSendable()) {
            console.error(`[DiscordProvider] Channel ${roomId} is not sendable`);
            return;
        }

        const chunks = sliceContent(content, 2000);
        for (const chunk of chunks) {
            try {
                await channel.send(chunk);
            } catch (err) {
                console.error(`[DiscordProvider] Failed to send message to channel ${roomId}:`, err);
            }
        }
    }
}