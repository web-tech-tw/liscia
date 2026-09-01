import type { LanguageModel } from "ai";
import type { ChatContext } from "./provider";
import type { AgentProviderOptions } from "../utils/prompts";

export type ChatAgentParams = {
    model: LanguageModel;
    instructions: string;
    providerOptions?: AgentProviderOptions;
};

export interface ChatAgent {
    replyMessage(ctx: ChatContext): Promise<string>;
}

