import { describe, it, expect, beforeEach } from "bun:test";
import {
    getSessionHistory,
    appendSessionMessage,
    clearSessionHistory,
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
