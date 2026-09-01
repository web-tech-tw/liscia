import { generateText, type ModelMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { ChatAgentParams, ChatAgent } from "../types/agent";
import type { ChatContext } from "../types/provider";
import { applyPromptCaching, buildAnthropicProviderOptions, formatUserProfileContext, formatChannelConfigTag } from "../utils/prompts";

const MAX_HISTORY_MESSAGES = 20;

const sessionHistories = new Map<string, ModelMessage[]>();

export function getSessionHistory(sessionId: string): ModelMessage[] {
    return sessionHistories.get(sessionId) || [];
}

export function appendSessionMessage(sessionId: string, message: ModelMessage): void {
    const history = sessionHistories.get(sessionId) || [];
    history.push(message);
    if (history.length > MAX_HISTORY_MESSAGES) {
        history.splice(0, history.length - MAX_HISTORY_MESSAGES);
    }
    sessionHistories.set(sessionId, history);
}

export function clearSessionHistory(sessionId?: string): void {
    if (sessionId) {
        sessionHistories.delete(sessionId);
    } else {
        sessionHistories.clear();
    }
}

export class Chat implements ChatAgent {
    private model: ChatAgentParams["model"];
    private instructions: string;
    private providerOptions?: ChatAgentParams["providerOptions"];

    constructor(params: ChatAgentParams) {
        this.model = params.model;
        this.instructions = params.instructions;
        this.providerOptions = params.providerOptions;
    }

    private buildContext(ctx: ChatContext): string {
        const configTag = formatChannelConfigTag(ctx.locales);
        const userContext = formatUserProfileContext(ctx.content, ctx.sender);
        return `${configTag}\n${userContext}`;
    }

    private buildMessages(ctx: ChatContext): ModelMessage[] {
        const sessionId = `${ctx.platformName}:${ctx.roomId}`;
        const historyMessages = getSessionHistory(sessionId);

        const userMessage: ModelMessage = {
            role: "user",
            content: this.buildContext(ctx),
        };

        return [
            ...applyPromptCaching(historyMessages),
            userMessage,
        ];
    }

    async replyMessage(ctx: ChatContext): Promise<string> {
        const sessionId = `${ctx.platformName}:${ctx.roomId}`;
        const messages = this.buildMessages(ctx);

        const result = await generateText({
            model: this.model,
            system: this.instructions,
            messages,
            providerOptions: this.providerOptions,
        });

        const reply = result.text;

        const userMessage = messages[messages.length - 1];
        if (userMessage) {
            appendSessionMessage(sessionId, userMessage);
        }
        if (reply) {
            appendSessionMessage(sessionId, {
                role: "assistant",
                content: reply,
            });
        }

        return reply;
    }
}

/**
 * Creates a new Chat instance initialized with system settings.
 */
export async function createChatAgent(): Promise<Chat> {
    const anthropic = createAnthropic({
        apiKey: Bun.env.ANTHROPIC_API_KEY,
        baseURL: Bun.env.ANTHROPIC_BASE_URL,
    });

    const settingsFile = Bun.file("./settings.xml");
    const instructions = await settingsFile.text();

    const providerOptions = buildAnthropicProviderOptions({
        thinking: Bun.env.ANTHROPIC_THINKING,
    });

    return new Chat({
        model: anthropic(Bun.env.ANTHROPIC_MODEL || "claude-sonnet-5"),
        instructions,
        providerOptions,
    });
}
