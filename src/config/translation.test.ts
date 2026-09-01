import { describe, it, expect } from "bun:test";
import { parseTranslationYaml } from "./translation";

describe("Translation Config YAML Parser", () => {
    it("should parse user specified format with gulid and channel list", () => {
        const yaml = `
gulid:
  1234:
    channels:
      - 1234342:
          locales:
            - en
            - zh-tw
`;
        const config = parseTranslationYaml(yaml);
        expect(config.channels.size).toBe(1);
        const channel = config.channels.get("1234342");
        expect(channel).toBeDefined();
        expect(channel?.locales).toEqual(["en", "zh-tw"]);
        expect(channel?.guildId).toBe("1234");
    });

    it("should parse multiple guilds, channels, and tri-lingual locales", () => {
        const yaml = `
default:
  locales:
    - en
    - ja

guilds:
  "guild_1":
    channels:
      "ch_bilingual":
        locales:
          - en
          - zh-tw
      "ch_trilingual":
        locales:
          - en
          - zh-tw
          - ja
`;
        const config = parseTranslationYaml(yaml);
        expect(config.defaultLocales).toEqual(["en", "ja"]);
        expect(config.channels.size).toBe(2);

        const bilingual = config.channels.get("ch_bilingual");
        expect(bilingual?.locales).toEqual(["en", "zh-tw"]);

        const trilingual = config.channels.get("ch_trilingual");
        expect(trilingual?.locales).toEqual(["en", "zh-tw", "ja"]);
    });

    it("should handle empty or invalid YAML gracefully", () => {
        const emptyConfig = parseTranslationYaml("");
        expect(emptyConfig.defaultLocales).toEqual(["en", "zh-tw"]);
        expect(emptyConfig.channels.size).toBe(0);

        const invalidConfig = parseTranslationYaml("some plain string");
        expect(invalidConfig.defaultLocales).toEqual(["en", "zh-tw"]);
        expect(invalidConfig.channels.size).toBe(0);
    });
});
