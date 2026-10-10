# Liscia (莉西亞)

正體中文 | [English](README.md)

專為 Discord 打造的多語言文字翻譯機器人。

你是否曾經希望有個頻道歡迎所有語言，
但對話總是最後各說各話、分角落聊天？

透過 Liscia，
每個成員只要用自己熟悉的語言發言，
機器人就會自動翻譯成其他所有設定的語言。

不用指令。不用複製貼上。沒有語言隔閡。

## 功能特色

* **頻道多語言自動翻譯**
  在 `translation.toml` 定義各頻道的語言清單。
  Liscia 自動偵測每則訊息的語言，並翻譯成其餘所有語言回覆。
* **格式完整保留**
  翻譯時保留 Markdown 排版、程式碼區塊、行內代碼、URLs、Emoji 與 Discord 提及標籤。
* **譯文乾淨直出**
  不添加任何問候、前後綴或廢話。
  機器人只輸出翻譯結果，沒有其他。

## 快速開始

### 環境需求

* [Bun](https://bun.sh/) (>= 1.2)
* Discord Bot Token
* OpenAI 相容 API 金鑰

### 安裝依賴

```sh
bun install
```

### 環境變數設定

複製 `.env.sample` 為 `.env` 並填入金鑰：

```sh
cp .env.sample .env
```

| 變數名稱            | 說明                                        |
| ------------------- | ------------------------------------------- |
| `OPENAI_API_KEY`    | OpenAI 相容 API 金鑰                        |
| `OPENAI_BASE_URL`   | OpenAI 相容 API 基礎網址                    |
| `OPENAI_MODEL`      | 模型名稱                                    |
| `DISCORD_BOT_TOKEN` | Discord Bot Token                           |
| `DISCORD_PRESENCE`  | Bot 狀態文字（預設：`Chief Translator`）     |

### 沒有 LLM API 金鑰嗎？

沒有預算申請 LLM API？沒問題！

[NVIDIA Build](https://build.nvidia.com/explore/discover) 提供了 100 多個模型，
全部掛在免費的 OpenAI 相容 API 後面。
只要用 Email 註冊，完全不用信用卡，
開啟任意模型頁面，點擊 **Get API Key** 即可取得免費的 `nvapi-` 金鑰。

Liscia 開箱即用。
推薦模型是 **`openai/gpt-oss-20b`**，
開放權重、多語言推理能力強且延遲低 —
同時也是 `.env.sample` 的預設值：

```sh
OPENAI_API_KEY="nvapi-..."
OPENAI_BASE_URL="https://integrate.api.nvidia.com/v1"
OPENAI_MODEL="openai/gpt-oss-20b"
```

### 設定 `translation.toml`

複製 `translation.sample.toml` 為 `translation.toml`，
並依各伺服器與頻道需求配置語言清單：

```sh
cp translation.sample.toml translation.toml
```

```toml
# 預設語言（用於私訊 DM 或未特別配置的頻道）
[default]
locales = ["en", "zh-tw"]

# 雙向翻譯頻道（中英互翻）：
# 輸入中文 -> 自動翻譯為英文
# 輸入英文 -> 自動翻譯為繁體中文
[guild."123456789012345678".channels."123434200000000001"]
locales = ["en", "zh-tw"]

# 三語翻譯頻道（英、中、日）：
# 輸入其中任一語言 -> 自動輸出其餘兩種語言（附語言標籤）
[guild."123456789012345678".channels."123434200000000002"]
locales = ["en", "zh-tw", "ja"]
```

### 啟動服務

```sh
# 開發模式（熱重載）
bun run dev

# 正式運行
bun run start
```

也可以用 Docker 運行：

```sh
docker build -t liscia .
docker run --env-file .env -v "$(pwd)/translation.toml:/app/translation.toml" liscia
```

## 開發

```sh
bun test       # 執行測試
bun run lint   # 執行 ESLint
```

## 專案架構

```text
├── app.ts                  # 服務進入點（啟動 Discord 翻譯機器人）
├── translation.sample.toml # 頻道翻譯設定檔範本
├── settings.xml            # 翻譯專家系統提示詞（包含動態語言規則）
└── src/
    ├── config/
    │   ├── translation.ts  # TOML 設定檔解析與頻道語言查詢
    │   └── translation.test.ts
    ├── agents/
    │   ├── chat.ts         # 翻譯 Agent 與記憶體 Session Store
    │   └── chat.test.ts
    ├── providers/
    │   └── discord.ts      # Discord Bot 適配器（自動監聽設定頻道）
    ├── types/              # 型別定義
    └── utils/              # 輔助函式（文字分塊、Prompt 快取）
```

## 授權

本專案採用 [MIT License](LICENSE) 授權。
