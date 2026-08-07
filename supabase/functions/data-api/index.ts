// Supabase Edge Function：CareAI 資料 API（取代原本的 Google Apps Script）
// 前端把 {action, ward, ...} 傳來，這裡用伺服器端的 service_role 金鑰讀寫 Postgres。
// 回傳格式刻意沿用原 GAS 的結構，讓前端幾乎不用改邏輯：
//   讀取：{ status:'success', data:[...] } 或 { status:'success', threshold:{...} }
//   寫入：{ status:'success' }
//   驗證：{ status:'success' } 或 { status:'error', message:'...' }
//
// 部署（公開、不驗證 JWT，前端才能直接呼叫）：
//   supabase functions deploy data-api --no-verify-jwt
// 需要的資料表見 supabase/schema.sql。
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 由 Supabase Edge 環境自動注入，無需手動設定。

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const b = await req.json();
    const action = b.action as string;
    const ward = b.ward as string;
    if (!action) return json({ status: "error", message: "缺少 action" }, 400);

    switch (action) {
      // ---- 密碼驗證：無此機構資料時自動建立（預設 1234）----
      case "verifyPassword": {
        let { data } = await supabase
          .from("app_passwords").select("password").eq("ward", ward).maybeSingle();
        if (!data) {
          await supabase.from("app_passwords").upsert({ ward, password: "1234" });
          data = { password: "1234" };
        }
        return String(b.password) === String(data.password)
          ? json({ status: "success" })
          : json({ status: "error", message: "密碼錯誤" });
      }

      case "updatePassword": {
        await supabase.from("app_passwords").upsert({
          ward, password: String(b.newPassword ?? ""), updated_at: new Date().toISOString(),
        });
        return json({ status: "success" });
      }

      // ---- 事件：新增/更新（皆為 upsert），回傳前端讀取用的完整物件形狀 ----
      case "saveEvent":
      case "updateEvent": {
        const obj = {
          id: b.id,
          saveDate: b.timestamp ?? "",
          eventType: b.eventType ?? "",
          residentName: b.residentName ?? "",
          bedNumber: b.bedNumber ?? "",
          deIdentifiedText: b.deIdentifiedText ?? "",
          rootCause: b.rootCause ?? "",
          improvement: b.improvement ?? "",
          followUp: b.followUp ?? "",
          imageSummary: b.imageSummary ?? "",
          rawInputDetails: {
            rawText: b.rawText ?? "",
            manualInputs: b.manualInputs ?? "{}",
            selections: b.selections ?? "{}",
            imageSummary: b.imageSummary ?? "",
          },
        };
        const { error } = await supabase.from("events").upsert({
          id: String(b.id), ward, save_date: String(b.timestamp ?? ""), data: obj,
        });
        if (error) return json({ status: "error", message: error.message }, 500);
        return json({ status: "success" });
      }

      case "getEvents": {
        const { data, error } = await supabase
          .from("events").select("data").eq("ward", ward)
          .order("created_at", { ascending: true });
        if (error) return json({ status: "error", message: error.message }, 500);
        return json({ status: "success", data: (data ?? []).map((r) => r.data) });
      }

      case "deleteEvent": {
        await supabase.from("events").delete().eq("ward", ward).eq("id", String(b.id));
        return json({ status: "success" });
      }

      // ---- PDCA：新增/更新 ----
      case "savePDCA":
      case "updatePDCA": {
        const obj = {
          id: b.id,
          saveDate: b.timestamp ?? "",
          timestamp: b.timestamp ?? "",
          dateRange: b.dateRange ?? "",
          eventsCount: b.eventsCount ?? 0,
          eventMode: b.eventMode ?? "",
          eventTypeLabel: b.eventTypeLabel ?? "",
          causeAnalysis: b.causeAnalysis ?? "",
          plan: b.plan ?? "",
          do: b.do ?? "",
          check: b.check ?? "",
          act: b.act ?? "",
        };
        const { error } = await supabase.from("pdca").upsert({
          id: String(b.id), ward, data: obj,
        });
        if (error) return json({ status: "error", message: error.message }, 500);
        return json({ status: "success" });
      }

      case "getPDCA": {
        const { data, error } = await supabase
          .from("pdca").select("data").eq("ward", ward)
          .order("created_at", { ascending: true });
        if (error) return json({ status: "error", message: error.message }, 500);
        return json({ status: "success", data: (data ?? []).map((r) => r.data) });
      }

      case "deletePDCA": {
        await supabase.from("pdca").delete().eq("ward", ward).eq("id", String(b.id));
        return json({ status: "success" });
      }

      // ---- 閾值：每機構一筆 ----
      case "saveThreshold": {
        let th = b.threshold;
        if (typeof th === "string") { try { th = JSON.parse(th); } catch { th = {}; } }
        const { error } = await supabase.from("thresholds").upsert({
          ward, data: th ?? {}, updated_at: new Date().toISOString(),
        });
        if (error) return json({ status: "error", message: error.message }, 500);
        return json({ status: "success" });
      }

      case "getThreshold": {
        const { data, error } = await supabase
          .from("thresholds").select("data").eq("ward", ward).maybeSingle();
        if (error) return json({ status: "error", message: error.message }, 500);
        return json({ status: "success", threshold: data ? data.data : null });
      }

      default:
        return json({ status: "error", message: "未知的 action: " + action }, 400);
    }
  } catch (e) {
    return json({ status: "error", message: String(e) }, 500);
  }
});
