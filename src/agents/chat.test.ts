import { describe, it, expect, beforeEach } from "bun:test";
import {
    getSessionHistory,
    appendSessionMessage,
    clearSessionHistory,
    createChatAgent,
    Chat,
    stripReasoningContentFromMessages,
} from "./chat";

describe("Chat Agent In-Memory Session Store", () => {
    beforeEach(() => {
        clearSessionHistory();
    });

    it("should return empty history for unseen session", () => {
        const history = getSessionHistory("discord:channel-123");
        expect(history).toEqual([]);
    });

    it("should append messages and maintain order", () => {
        const sessionId = "discord:channel-123";
        appendSessionMessage(sessionId, { role: "user", content: "Hello" });
        appendSessionMessage(sessionId, { role: "assistant", content: "Hi there!" });

        const history = getSessionHistory(sessionId);
        expect(history.length).toBe(2);
        expect(history[0]?.content).toBe("Hello");
        expect(history[1]?.content).toBe("Hi there!");
    });

    it("should cap history length to max limit (20 messages)", () => {
        const sessionId = "discord:channel-overflow";
        for (let i = 0; i < 25; i++) {
            appendSessionMessage(sessionId, {
                role: i % 2 === 0 ? "user" : "assistant",
                content: `Message ${i}`,
            });
        }

        const history = getSessionHistory(sessionId);
        expect(history.length).toBe(20);
        expect(history[0]?.content).toBe("Message 5");
        expect(history[19]?.content).toBe("Message 24");
    });

    it("should clear session history individually or entirely", () => {
        appendSessionMessage("discord:1", { role: "user", content: "A" });
        appendSessionMessage("discord:2", { role: "user", content: "B" });

        clearSessionHistory("discord:1");
        expect(getSessionHistory("discord:1")).toEqual([]);
        expect(getSessionHistory("discord:2").length).toBe(1);

        clearSessionHistory();
        expect(getSessionHistory("discord:2")).toEqual([]);
    });
});

describe("createChatAgent", () => {
    it("should instantiate Chat with OpenAI-compatible provider", async () => {
        const agent = await createChatAgent();
        expect(agent).toBeInstanceOf(Chat);
    });
});

describe("stripReasoningContentFromMessages", () => {
    it("should strip reasoning_content and reasoning from assistant messages", () => {
        const input: Record<string, unknown> = {
            model: "openai/gpt-oss-20b",
            messages: [
                { role: "system", content: "You are a translator." },
                { role: "user", content: "Hello!" },
                {
                    role: "assistant",
                    content: "你好！",
                    reasoning_content: "User said hello in English, translate to Traditional Chinese.",
                    reasoning: "Some reasoning text.",
                },
                { role: "user", content: "How are you?" },
            ],
        };

        const result = stripReasoningContentFromMessages(input);

        expect(result.model).toBe("openai/gpt-oss-20b");
        const messages = result.messages as Array<Record<string, unknown>>;
        expect(messages).toHaveLength(4);

        expect(messages[0]).toEqual({ role: "system", content: "You are a translator." });
        expect(messages[1]).toEqual({ role: "user", content: "Hello!" });
        expect(messages[3]).toEqual({ role: "user", content: "How are you?" });

        expect(messages[2]).toEqual({ role: "assistant", content: "你好！" });
        expect("reasoning_content" in (messages[2] ?? {})).toBe(false);
        expect("reasoning" in (messages[2] ?? {})).toBe(false);
    });

    it("should return original args if messages is not an array", () => {
        const input: Record<string, unknown> = { model: "test" };
        const result = stripReasoningContentFromMessages(input);
        expect(result).toBe(input);
    });
});


