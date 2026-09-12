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
 * Parses TOML configuration string into structured TranslationConfig.
 * Throws an Error if TOML parsing fails.
 *
 * @param raw Raw TOML string.
 * @returns Parsed translation configuration.
 */
export function parseTranslationToml(raw: string): TranslationConfig {
    const defaultLocales: string[] = [];
    const channels = new Map<string, ChannelTranslationConfig>();

    if (!raw || !raw.trim()) {
        return { defaultLocales, channels };
    }

    const parsed = Bun.TOML.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") {
        return { defaultLocales, channels };
    }

    // 1. Parse default locales
    const defaultSection = (parsed.default || parsed.defaults) as Record<string, unknown> | undefined;
    if (defaultSection && Array.isArray(defaultSection.locales)) {
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
    if (guildSection) {
        if (Array.isArray(guildSection)) {
            for (const guildData of guildSection) {
                if (guildData && typeof guildData === "object") {
                    const rec = guildData as Record<string, unknown>;
                    const gId = rec.id || rec.guildId;
                    if (rec.channels) {
                        parseChannelsNode(rec.channels, gId ? String(gId) : undefined);
                    }
                }
            }
        } else if (typeof guildSection === "object") {
            for (const [guildId, guildData] of Object.entries(guildSection)) {
                if (guildData && typeof guildData === "object" && "channels" in guildData) {
                    parseChannelsNode((guildData as Record<string, unknown>).channels, guildId);
                }
            }
        }
    }

    // 3. Parse top-level channels section
    if (parsed.channels) {
        parseChannelsNode(parsed.channels);
    }

    return {
        defaultLocales,
        channels,
    };
}

let cachedConfig: TranslationConfig | null = null;

/**
 * Sets or clears the cached translation configuration.
 *
 * @param config Configuration to cache or null to clear.
 */
export function setCachedTranslationConfig(config: TranslationConfig | null): void {
    cachedConfig = config;
}

/**
 * Loads translation config from disk without fallback.
 * Checks customPath, TRANSLATION_CONFIG_PATH env, or default "./translation.toml".
 * Throws an Error if the file does not exist or fails to parse.
 *
 * @param customPath Optional custom path to translation config file.
 * @returns Loaded translation configuration.
 */
export async function loadTranslationConfig(customPath?: string): Promise<TranslationConfig> {
    const configPath = customPath || Bun.env.TRANSLATION_CONFIG_PATH || "./translation.toml";
    const file = Bun.file(configPath);

    if (!(await file.exists())) {
        throw new Error(`[TranslationConfig] Configuration file not found at "${configPath}". Please provide translation.toml or set TRANSLATION_CONFIG_PATH.`);
    }

    try {
        const text = await file.text();
        const config = parseTranslationToml(text);
        console.info(`[TranslationConfig] Loaded configuration from ${configPath} (${config.channels.size} channels mapped)`);
        cachedConfig = config;
        return config;
    } catch (err) {
        throw new Error(
            `[TranslationConfig] Failed to parse ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
            { cause: err },
        );
    }
}

/**
 * Gets cached translation config synchronously.
 * Throws an Error if configuration has not been loaded.
 *
 * @returns Cached translation configuration.
 */
export function getTranslationConfig(): TranslationConfig {
    if (!cachedConfig) {
        throw new Error("[TranslationConfig] Configuration has not been loaded. Call loadTranslationConfig() first.");
    }
    return cachedConfig;
}

/**
 * Returns configured locales for a specific channel.
 *
 * @param channelId Discord channel ID.
 * @param config Optional loaded translation configuration.
 * @returns Array of locales or undefined.
 */
export function getChannelLocales(channelId: string, config?: TranslationConfig): string[] | undefined {
    const cfg = config || getTranslationConfig();
    return cfg.channels.get(channelId)?.locales;
}
