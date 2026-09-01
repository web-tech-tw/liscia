# Liscia (莉西亞)

專用於 Discord 的多語言文字翻譯機器人，由 `translation.yaml` 設定各伺服器與頻道的語言清單，在頻道中自動將發言翻譯為目標語言。

---

## 功能特色

* **頻道多語言自動翻譯**：在 `translation.yaml` 設定頻道對應的語言代碼（如 `en`, `zh-tw`, `ja`），自動偵測發言語言並翻譯為其他指定語言。
* **格式完整保留**：翻譯時保留 Markdown 排版、程式碼區塊、行內代碼、URLs、Emoji 與 Discord 提及標籤。
* **譯文乾淨直出**：不添加任何多餘問候或前後綴廢話，直接輸出翻譯結果。

---

## 快速開始

### 1. 環境需求

* [Bun](https://bun.sh/) (>= 1.2)

### 2. 安裝依賴

```bash
bun install
```

### 3. 環境變數設定

複製 `.env.sample` 為 `.env` 並填入金鑰：

```bash
cp .env.sample .env
```

| 變數名稱 | 說明 |
| :--- | :--- |
| `ANTHROPIC_API_KEY` | Anthropic API 金鑰 |
| `ANTHROPIC_MODEL` | 模型名稱（預設：`claude-sonnet-5`） |
| `DISCORD_BOT_TOKEN` | Discord Bot Token |
| `DISCORD_PRESENCE` | Bot 狀態文字（預設：`Chief Translator`） |

### 4. 設定 `translation.yaml`

複製 `translation.sample.yaml` 為 `translation.yaml`，並依各伺服器與頻道需求配置語言清單：

```bash
cp translation.sample.yaml translation.yaml
```

```yaml
# translation.yaml 範例
default:
  locales:
    - en
    - zh-tw

guild:
  "123456789012345678":
    channels:
      # 雙向翻譯頻道：輸入中文翻英文，輸入英文翻繁體中文
      - "123434200000000001":
          locales:
            - en
            - zh-tw

      # 三語翻譯頻道：輸入其中一語，輸出其餘兩種語言（附語言標籤）
      - "123434200000000002":
          locales:
            - en
            - zh-tw
            - ja
```

### 5. 啟動服務

```bash
# 開發模式（熱重載）
bun run dev

# 正式運行
bun run start
```

---

## 專案架構

```text
├── app.ts                  # 服務進入點（啟動 Discord 翻譯機器人）
├── translation.sample.yaml # 頻道翻譯設定檔範本
├── settings.xml            # 翻譯專家系統提示詞（包含動態語言規則）
├── src/
│   ├── config/
│   │   ├── translation.ts  # YAML 設定檔解析與頻道語言查詢
│   │   └── translation.test.ts
│   ├── agents/
│   │   ├── chat.ts         # 翻譯 Agent 與記憶體 Session Store
│   │   └── chat.test.ts
│   ├── providers/
│   │   └── discord.ts      # Discord Bot 適配器（自動監聽設定頻道）
│   ├── types/              # 型別定義
│   └── utils/              # 輔助函式（文字分塊、Prompt 快取）
```

---

## 授權

本專案採用 [MIT License](LICENSE) 授權。
