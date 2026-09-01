export interface ChannelTranslationConfig {
    guildId?: string;
    channelId: string;
    locales: string[];
}

export interface TranslationConfig {
    defaultLocales: string[];
    channels: Map<string, ChannelTranslationConfig>;
}

/**
 * Parses YAML configuration string into structured TranslationConfig.
 */
export function parseTranslationYaml(raw: string): TranslationConfig {
    const defaultLocales: string[] = ["en", "zh-tw"];
    const channels = new Map<string, ChannelTranslationConfig>();

    if (!raw || !raw.trim()) {
        return { defaultLocales, channels };
    }

    const parsed = Bun.YAML.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") {
        return { defaultLocales, channels };
    }

    // 1. Parse default locales
    const defaultSection = (parsed.default || parsed.defaults) as Record<string, unknown> | undefined;
    if (defaultSection && Array.isArray(defaultSection.locales)) {
        defaultLocales.length = 0;
        for (const loc of defaultSection.locales) {
            if (typeof loc === "string" && loc.trim()) {
                defaultLocales.push(loc.trim().toLowerCase());
            }
        }
    }

    // Helper to register channel
    function addChannel(channelId: string, localesInput: unknown, guildId?: string): void {
        if (!channelId) return;
        const normalizedId = String(channelId).trim();
        const locales: string[] = [];
        if (Array.isArray(localesInput)) {
            for (const l of localesInput) {
                if (typeof l === "string" && l.trim()) {
                    locales.push(l.trim().toLowerCase());
                }
            }
        }
        if (locales.length > 0) {
            channels.set(normalizedId, {
                channelId: normalizedId,
                guildId: guildId ? String(guildId).trim() : undefined,
                locales,
            });
        }
    }

    // Helper to parse channels node (either array or object)
    function parseChannelsNode(channelsNode: unknown, guildId?: string): void {
        if (!channelsNode) return;
        if (Array.isArray(channelsNode)) {
            for (const item of channelsNode) {
                if (!item || typeof item !== "object") continue;
                const rec = item as Record<string, unknown>;
                if (rec.id && rec.locales) {
                    addChannel(String(rec.id), rec.locales, guildId);
                } else if (rec.channelId && rec.locales) {
                    addChannel(String(rec.channelId), rec.locales, guildId);
                } else {
                    for (const [chId, val] of Object.entries(rec)) {
                        if (val && typeof val === "object" && "locales" in val) {
                            addChannel(chId, (val as Record<string, unknown>).locales, guildId);
                        }
                    }
                }
            }
        } else if (typeof channelsNode === "object") {
            for (const [chId, val] of Object.entries(channelsNode as Record<string, unknown>)) {
                if (val && typeof val === "object" && "locales" in val) {
                    addChannel(chId, (val as Record<string, unknown>).locales, guildId);
                }
            }
        }
    }

    // 2. Parse guild / gulid / guilds sections
    const guildSection = (parsed.guild || parsed.gulid || parsed.guilds) as Record<string, unknown> | undefined;
    if (guildSection && typeof guildSection === "object") {
        for (const [guildId, guildData] of Object.entries(guildSection)) {
            if (guildData && typeof guildData === "object" && "channels" in guildData) {
                parseChannelsNode((guildData as Record<string, unknown>).channels, guildId);
            }
        }
    }

    // 3. Parse top-level channels section
    if (parsed.channels) {
        parseChannelsNode(parsed.channels);
    }

    return {
        defaultLocales: defaultLocales.length > 0 ? defaultLocales : ["en", "zh-tw"],
        channels,
    };
}

let cachedConfig: TranslationConfig | null = null;

/**
 * Loads translation config from disk, checking TRANSLATION_CONFIG_PATH, translation.yaml, and translation.yml.
 */
export async function loadTranslationConfig(customPath?: string): Promise<TranslationConfig> {
    const candidatePaths = [
        customPath,
        Bun.env.TRANSLATION_CONFIG_PATH,
        "./translation.yaml",
        "./translation.yml",
    ].filter((p): p is string => Boolean(p && p.trim()));

    for (const filePath of candidatePaths) {
        const file = Bun.file(filePath);
        if (await file.exists()) {
            try {
                const text = await file.text();
                const config = parseTranslationYaml(text);
                console.info(`[TranslationConfig] Loaded configuration from ${filePath} (${config.channels.size} channels mapped)`);
                cachedConfig = config;
                return config;
            } catch (err) {
                console.error(`[TranslationConfig] Failed to parse ${filePath}:`, err);
            }
        }
    }

    console.warn("[TranslationConfig] No translation.yaml found; falling back to default locales [en, zh-tw]");
    const fallback: TranslationConfig = {
        defaultLocales: ["en", "zh-tw"],
        channels: new Map(),
    };
    cachedConfig = fallback;
    return fallback;
}

/**
 * Gets cached translation config synchronously.
 */
export function getTranslationConfig(): TranslationConfig {
    if (!cachedConfig) {
        cachedConfig = {
            defaultLocales: ["en", "zh-tw"],
            channels: new Map(),
        };
    }
    return cachedConfig;
}

/**
 * Returns configured locales for a specific channel.
 */
export function getChannelLocales(channelId: string, config?: TranslationConfig): string[] | undefined {
    const cfg = config || getTranslationConfig();
    return cfg.channels.get(channelId)?.locales;
}
