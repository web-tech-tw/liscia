# Liscia (莉西亞)

[正體中文](README.zh-TW.md) | English

A multilingual text translation bot built for Discord.

Have you ever wanted a Discord channel that welcomes every language,
but the conversation always ends up split into separate corners?

Through Liscia,
each member simply types in their own language,
and the bot automatically translates the message into every other configured language.

No commands. No copy-pasting. No language barriers.

## Features

* **Channel-based multilingual translation**
  Define the locale list for each channel in `translation.toml`.
  Liscia detects the language of each message and replies with translations into all the other locales.
* **Formatting fully preserved**
  Markdown layout, code blocks, inline code, URLs, emoji, and Discord mentions are kept intact.
* **Clean, direct output**
  No greetings, no preambles, no extra fluff.
  The bot outputs the translation and nothing else.

## Quick Start

### Prerequisites

* [Bun](https://bun.sh/) (>= 1.2)
* A Discord bot token
* An OpenAI-compatible API key

### Install

```sh
bun install
```

### Environment Variables

Copy `.env.sample` to `.env` and fill in your credentials:

```sh
cp .env.sample .env
```

| Variable            | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `OPENAI_API_KEY`    | OpenAI-compatible API key                                     |
| `OPENAI_BASE_URL`   | OpenAI-compatible base URL                                    |
| `OPENAI_MODEL`      | Model name                                                   |
| `DISCORD_BOT_TOKEN` | Discord bot token                                            |
| `DISCORD_PRESENCE`  | Bot presence text (default: `Chief Translator`)               |

### Don't Have an LLM API Key?

No budget for an LLM API? No problem!

[NVIDIA Build](https://build.nvidia.com/explore/discover) hosts 100+ models
behind a free, OpenAI-compatible API.
Sign up with an email, no credit card required,
open any model page, and click **Get API Key** to receive a free `nvapi-` key.

Liscia runs on it out of the box.
The recommended model is **`openai/gpt-oss-20b`**,
an open-weight model with strong multilingual reasoning and low latency —
it is also the default in `.env.sample`:

```sh
OPENAI_API_KEY="nvapi-..."
OPENAI_BASE_URL="https://integrate.api.nvidia.com/v1"
OPENAI_MODEL="openai/gpt-oss-20b"
```

### Configure `translation.toml`

Copy `translation.sample.toml` to `translation.toml`,
then define the locale list for each guild and channel:

```sh
cp translation.sample.toml translation.toml
```

```toml
# Default locales (used for DMs and unconfigured channels)
[default]
locales = ["en", "zh-tw"]

# Bilingual channel (EN <-> zh-TW):
# Type in Chinese -> translated to English
# Type in English -> translated to Traditional Chinese
[guild."123456789012345678".channels."123434200000000001"]
locales = ["en", "zh-tw"]

# Trilingual channel (EN, zh-TW, JA):
# Type in any one of the locales -> replies with the other two
[guild."123456789012345678".channels."123434200000000002"]
locales = ["en", "zh-tw", "ja"]
```

### Run

```sh
# Development (hot reload)
bun run dev

# Production
bun run start
```

Or run it with Docker:

```sh
docker build -t liscia .
docker run --env-file .env -v "$(pwd)/translation.toml:/app/translation.toml" liscia
```

## Development

```sh
bun test       # Run tests
bun run lint   # Run ESLint
```

## Project Structure

```text
├── app.ts                  # Entry point (starts the Discord translation bot)
├── translation.sample.toml # Sample channel translation config
├── settings.xml            # Translation system prompt (with dynamic language rules)
└── src/
    ├── config/
    │   ├── translation.ts  # TOML config parsing and per-channel locale lookup
    │   └── translation.test.ts
    ├── agents/
    │   ├── chat.ts         # Translation agent with in-memory session store
    │   └── chat.test.ts
    ├── providers/
    │   └── discord.ts     # Discord adapter (watches configured channels)
    ├── types/              # Type definitions
    └── utils/              # Helpers (text chunking, prompt caching)
```

## License

This project is licensed under the [MIT License](LICENSE).
