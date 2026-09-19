import { generateText, type ModelMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatAgentParams, ChatAgent } from "../types/agent";
import type { ChatContext } from "../types/provider";
import { formatUserProfileContext, formatChannelConfigTag } from "../utils/prompts";
import { formatTranslationReply } from "../utils/text";

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
            ...historyMessages,
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

        const reply = formatTranslationReply(result.text);

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
 * Creates an OpenAI-compatible provider instance.
 */
export function createOpenAICompatibleProvider(options?: { apiKey?: string; baseURL?: string }) {
    return createOpenAICompatible({
        name: "openai-compatible",
        baseURL: options?.baseURL || Bun.env.OPENAI_BASE_URL || "",
        apiKey: options?.apiKey || Bun.env.OPENAI_API_KEY,
    });
}

/**
 * Creates a new Chat instance initialized with system settings.
 */
export async function createChatAgent(): Promise<Chat> {
    const provider = createOpenAICompatibleProvider();

    const settingsFile = Bun.file("./settings.xml");
    const instructions = await settingsFile.text();

    return new Chat({
        model: provider(Bun.env.OPENAI_MODEL || ""),
        instructions,
    });
}
