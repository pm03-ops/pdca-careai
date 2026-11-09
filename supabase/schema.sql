-- CareAI 長照系統：Supabase Postgres 資料表結構
-- 在 Supabase 後台 → SQL Editor 貼上執行一次即可建立所有資料表。
-- 設計原則：每筆紀錄用 jsonb 存完整物件（前端讀取的形狀），另外拉出常用欄位建索引。

-- 各機構登入密碼（預設 1234，由 data-api 於首次驗證時自動建立）
create table if not exists app_passwords (
  ward       text primary key,
  password   text not null default '1234',
  updated_at timestamptz default now()
);

-- 異常事件（deleted_at 不為空＝已軟刪除，前台不顯示但後台保留）
create table if not exists events (
  id         text primary key,
  ward       text not null,
  save_date  text,
  data       jsonb not null,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
create index if not exists idx_events_ward on events (ward);

-- PDCA 報告（deleted_at 同上）
create table if not exists pdca (
  id         text primary key,
  ward       text not null,
  data       jsonb not null,
  created_at timestamptz default now(),
  deleted_at timestamptz
);
create index if not exists idx_pdca_ward on pdca (ward);

-- 既有資料庫補欄位（新建會已含，舊的執行這兩行即可；對現有資料無影響）
alter table events add column if not exists deleted_at timestamptz;
alter table pdca   add column if not exists deleted_at timestamptz;

-- 閾值設定（每機構一筆）
create table if not exists thresholds (
  ward       text primary key,
  data       jsonb not null,
  updated_at timestamptz default now()
);
