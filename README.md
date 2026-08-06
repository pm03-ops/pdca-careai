# CareAI 長照智能分析系統（公開乾淨版）

單頁 HTML 應用：異常事件智能分析 + 月底 PDCA 品質改善報告。

> 這是**公開版**：所有機敏金鑰都已從程式碼移除。
> - Gemini API 金鑰 → 改由 **Supabase Edge Function** 在伺服器端保管（見下方部署）。
> - 資料後端（Google Apps Script）網址 → 不寫死，登入後於「系統與資源設定」填入。

---

## 檔案結構
```
.
├── index.html                          # 前端主程式（無任何金鑰）
├── supabase/functions/gemini-proxy/
│   └── index.ts                        # Gemini API 代理（金鑰放這裡的伺服器環境）
└── README.md
```

---

## 一、部署 Supabase Gemini 代理（讓 AI 功能可用）

1. 到 https://supabase.com 建立一個新專案（記下專案的網址）。
2. 安裝 Supabase CLI 並登入：
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <你的專案ref>
   ```
3. 設定 Gemini 金鑰（存在 Supabase 伺服器，不會外流）：
   ```bash
   supabase secrets set GEMINI_API_KEY=你的Gemini金鑰
   ```
4. 部署代理函式（`--no-verify-jwt` 讓前端可直接呼叫）：
   ```bash
   supabase functions deploy gemini-proxy --no-verify-jwt
   ```
5. 部署後會得到函式網址，形如：
   `https://<專案ref>.supabase.co/functions/v1/gemini-proxy`

> 不想用 CLI 也可以：在 Supabase 後台 → Edge Functions → 新建 `gemini-proxy`，把 `supabase/functions/gemini-proxy/index.ts` 內容貼上部署；並在 Settings → Edge Functions → Secrets 加 `GEMINI_API_KEY`。

## 二、把函式網址填進前端
打開 `index.html`，找到最上方：
```js
const GEMINI_PROXY_URL = "__FILL_SUPABASE_FUNCTION_URL__";
```
換成步驟 5 的網址：
```js
const GEMINI_PROXY_URL = "https://<專案ref>.supabase.co/functions/v1/gemini-proxy";
```

## 三、資料後端（Google Apps Script）
資料仍儲存在你原本的 Google Sheets。第一次使用時：
- 登入任一機構 → 右下角「系統與資源設定」→ 填入你的 GAS 網址（`https://script.google.com/macros/s/.../exec`）。
- 該網址會存在瀏覽器（localStorage），不會進到這個公開 repo。

---

## 本機測試
```bash
python -m http.server 8000
# 瀏覽器開 http://localhost:8000/index.html
```

## 安全說明
- 本 repo **不含**任何 API 金鑰或正式資料端點。
- Gemini 金鑰只存在 Supabase 伺服器環境變數。
- GAS 資料網址只存在使用者自己的瀏覽器。
