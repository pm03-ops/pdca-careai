// Supabase Edge Function：Gemini API 代理
// 作用：前端把 Gemini 請求 body 傳來，這裡加上「伺服器端保管的金鑰」再轉發給 Google，
//       讓 Gemini API 金鑰不會出現在前端/公開的 HTML 或 GitHub 上。
//
// 部署前請在 Supabase 設定密鑰：
//   supabase secrets set GEMINI_API_KEY=你的Gemini金鑰
// 部署（公開、不驗證 JWT，前端才能直接呼叫）：
//   supabase functions deploy gemini-proxy --no-verify-jwt

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODEL = "gemini-2.5-flash";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // CORS 預檢
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "伺服器尚未設定 GEMINI_API_KEY 密鑰" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    // 前端傳來的完整 Gemini 請求 body（contents / generationConfig）
    const body = await req.json();

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const text = await geminiRes.text();
    // 原樣把 Gemini 的回應轉回前端（保留原本的狀態碼）
    return new Response(text, {
      status: geminiRes.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
