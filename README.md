# CareAI 長照智能分析系統（公開乾淨版）

單頁 HTML 應用：異常事件智能分析 + 月底 PDCA 品質改善報告。

> 這是**公開版**：所有機敏金鑰都由 **Supabase** 在伺服器端保管，程式碼裡沒有任何金鑰。
> - AI（Gemini）→ 由 Supabase Edge Function `gemini-proxy` 代理金鑰。
> - 資料後端 → 由 Supabase Edge Function `data-api` + Postgres 儲存（已取代舊版的 Google Apps Script）。

線上網址：https://pm03-ops.github.io/pdca-careai/

---

## 檔案結構
```
.
├── index.html                          # 前端主程式（無任何金鑰）
├── supabase/
│   ├── schema.sql                      # Postgres 資料表結構
│   └── functions/
│       ├── gemini-proxy/index.ts       # Gemini API 代理（金鑰放伺服器環境）
│       └── data-api/index.ts           # 資料後端（讀寫 Postgres，取代 GAS）
└── README.md
```

---

## 一、部署 Supabase（讓 AI 與資料功能可用）

1. 到 https://supabase.com 建立一個專案（記下專案 ref 與網址）。
2. 建立資料表：後台 → **SQL Editor** → 貼上 `supabase/schema.sql` 內容執行一次
   （建表時選「Run and enable RLS」，資料表只有伺服器端的 `data-api` 能存取）。
3. 設定 Gemini 金鑰（存在 Supabase 伺服器，不會外流）：
   ```bash
   supabase secrets set GEMINI_API_KEY=你的Gemini金鑰
   ```
4. 部署兩支函式（`--no-verify-jwt` 讓前端可直接呼叫；密碼驗證由 `data-api` 內部處理）：
   ```bash
   supabase functions deploy gemini-proxy --no-verify-jwt
   supabase functions deploy data-api     --no-verify-jwt
   ```
   > `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY` 由 Supabase Edge 環境自動注入，`data-api` 直接讀取，無需手動設定。

> 不想用 CLI 也可以：後台 → Edge Functions → 「Deploy a new function → Via Editor」，把對應 `index.ts` 貼上部署；部署後到該函式 **Settings** 把「Verify JWT」關掉；Gemini 金鑰在 Settings → Edge Functions → Secrets 新增。
> 注意：本專案的 Gemini 金鑰對有版本號的型號（如 `gemini-2.5-flash`）會回 404，`gemini-proxy` 因此使用 `gemini-flash-latest` 別名。

## 二、把函式網址填進前端
打開 `index.html` 最上方，換成你自己專案的網址：
```js
const GEMINI_PROXY_URL = "https://<專案ref>.supabase.co/functions/v1/gemini-proxy";
const DATA_API_URL     = "https://<專案ref>.supabase.co/functions/v1/data-api";
```

## 三、開始使用
- 打開網頁 → 選機構 → 輸入密碼（每個機構預設 `1234`，首次驗證時由 `data-api` 自動建立）。
- 登入後右下角「系統與資源設定」可改密碼、填 AI 背景資源、設定閾值。
- 所有事件、PDCA、閾值、密碼都存在 Supabase Postgres。

---

## 本機測試
```bash
python -m http.server 8000
# 瀏覽器開 http://localhost:8000/index.html
```

## 安全說明
- 本 repo **不含**任何 API 金鑰。
- Gemini 金鑰、Postgres service_role 金鑰都只存在 Supabase 伺服器環境。
- 資料表已啟用 RLS，只有伺服器端的 `data-api`（service_role）能讀寫；即使外流 anon 金鑰也無法直接存取資料。
- 存取控制沿用「機構＋密碼」模式（與舊版一致），密碼驗證在 `data-api` 內部進行。
