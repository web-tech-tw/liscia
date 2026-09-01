export const PlatformName = {
    Discord: "Discord",
} as const;

export type PlatformName = (typeof PlatformName)[keyof typeof PlatformName];

export type MessageCallback = (ctx: ChatContext) => Promise<void>;
export type CommandCallback = (command: string, args: string[], ctx: ChatContext) => Promise<void>;

export interface BasePlatformProvider extends BaseProvider {
    sendText(roomId: string, content: string): void | Promise<void>;
}

export interface BaseProvider {
    readonly name: PlatformName;
    readonly enabled: boolean;
    start(): void | Promise<void>;
    stop(): void | Promise<void>;
    onMessage(cb: MessageCallback): void;
    onCommand(cb: CommandCallback): void;
}

export interface UserProfile {
    id: string;
    nickname: string;
    username?: string;
    [key: string]: unknown;
}

export interface ChatContext {
    platformName: PlatformName;
    roomId: string;
    guildId?: string;
    locales?: string[];
    sender: UserProfile;
    content: string;
    reply(content: string): Promise<void>;
}
