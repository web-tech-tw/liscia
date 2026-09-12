import { describe, it, expect, beforeEach } from "bun:test";
import {
    parseTranslationToml,
    loadTranslationConfig,
    getTranslationConfig,
    setCachedTranslationConfig,
    getChannelLocales,
} from "./translation";

describe("Translation Config TOML Parser", () => {
    beforeEach(() => {
        setCachedTranslationConfig(null);
    });

    it("should parse format with guild and channel tables", () => {
        const toml = `
[guild."1234".channels."1234342"]
locales = ["en", "zh-tw"]
`;
        const config = parseTranslationToml(toml);
        expect(config.channels.size).toBe(1);
        const channel = config.channels.get("1234342");
        expect(channel).toBeDefined();
        expect(channel?.locales).toEqual(["en", "zh-tw"]);
        expect(channel?.guildId).toBe("1234");
    });

    it("should parse multiple guilds, channels, and tri-lingual locales", () => {
        const toml = `
[default]
locales = ["en", "ja"]

[guilds.guild_1.channels.ch_bilingual]
locales = ["en", "zh-tw"]

[guilds.guild_1.channels.ch_trilingual]
locales = ["en", "zh-tw", "ja"]
`;
        const config = parseTranslationToml(toml);
        expect(config.defaultLocales).toEqual(["en", "ja"]);
        expect(config.channels.size).toBe(2);

        const bilingual = config.channels.get("ch_bilingual");
        expect(bilingual?.locales).toEqual(["en", "zh-tw"]);

        const trilingual = config.channels.get("ch_trilingual");
        expect(trilingual?.locales).toEqual(["en", "zh-tw", "ja"]);
    });

    it("should parse array of tables syntax", () => {
        const toml = `
[[guild."123456".channels]]
id = "ch_001"
locales = ["en", "zh-tw"]

[[guild."123456".channels]]
id = "ch_002"
locales = ["en", "ja"]
`;
        const config = parseTranslationToml(toml);
        expect(config.channels.size).toBe(2);
        expect(config.channels.get("ch_001")?.locales).toEqual(["en", "zh-tw"]);
        expect(config.channels.get("ch_002")?.locales).toEqual(["en", "ja"]);
    });

    it("should not fall back to default locales if default is omitted", () => {
        const toml = `
[guild."1234".channels."1234342"]
locales = ["en", "zh-tw"]
`;
        const config = parseTranslationToml(toml);
        expect(config.defaultLocales).toEqual([]);
    });

    it("should return empty config for empty string without fallback", () => {
        const emptyConfig = parseTranslationToml("");
        expect(emptyConfig.defaultLocales).toEqual([]);
        expect(emptyConfig.channels.size).toBe(0);
    });

    it("should throw on invalid TOML syntax without fallback", () => {
        expect(() => parseTranslationToml("some plain invalid string without equals")).toThrow();
    });
});

describe("Translation Config Loader & Getter (No Fallback)", () => {
    beforeEach(() => {
        setCachedTranslationConfig(null);
    });

    it("should throw if getTranslationConfig is called before loading", () => {
        expect(() => getTranslationConfig()).toThrow(
            "[TranslationConfig] Configuration has not been loaded. Call loadTranslationConfig() first.",
        );
    });

    it("should throw if loadTranslationConfig target file does not exist", async () => {
        await expect(loadTranslationConfig("./non_existent_config.toml")).rejects.toThrow(
            /Configuration file not found at/i,
        );
    });

    it("should load valid TOML file, cache it, and allow getChannelLocales", async () => {
        const samplePath = "./translation.sample.toml";
        const loaded = await loadTranslationConfig(samplePath);

        expect(loaded.defaultLocales).toEqual(["en", "zh-tw"]);
        expect(loaded.channels.size).toBe(2);

        const channelLocales = getChannelLocales("123434200000000001");
        expect(channelLocales).toEqual(["en", "zh-tw"]);

        const synchronousConfig = getTranslationConfig();
        expect(synchronousConfig).toBe(loaded);
    });
});
