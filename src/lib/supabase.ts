import { createClient } from "@supabase/supabase-js";

// LiteERP — 連線到使用者自有的 Supabase 雲端專案
// 注意:此檔案刻意「不」使用 Lovable Cloud 內建的 client,
// 而是直接指向外部 Supabase。anon key 為 publishable 金鑰,可安全置於前端。

// 注意:VITE_SUPABASE_URL 由 Lovable Cloud 自動產生(指向另一個專案),不可使用,
// 否則 URL 與外部 anon key 不匹配 → "Invalid API key"。
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Please copy .env.example to .env.local and fill in your project credentials.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
