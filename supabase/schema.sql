-- CareAI 長照系統：Supabase Postgres 資料表結構
-- 在 Supabase 後台 → SQL Editor 貼上執行一次即可建立所有資料表。
-- 設計原則：每筆紀錄用 jsonb 存完整物件（前端讀取的形狀），另外拉出常用欄位建索引。

-- 各機構登入密碼（預設 1234，由 data-api 於首次驗證時自動建立）
create table if not exists app_passwords (
  ward       text primary key,
  password   text not null default '1234',
  updated_at timestamptz default now()
);

-- 異常事件
create table if not exists events (
  id         text primary key,
  ward       text not null,
  save_date  text,
  data       jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_events_ward on events (ward);

-- PDCA 報告
create table if not exists pdca (
  id         text primary key,
  ward       text not null,
  data       jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_pdca_ward on pdca (ward);

-- 閾值設定（每機構一筆）
create table if not exists thresholds (
  ward       text primary key,
  data       jsonb not null,
  updated_at timestamptz default now()
);
