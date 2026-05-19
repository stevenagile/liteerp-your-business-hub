import { createClient } from "@supabase/supabase-js";

// LiteERP — 連線到使用者自有的 Supabase 雲端專案
// 注意:此檔案刻意「不」使用 Lovable Cloud 內建的 client,
// 而是直接指向外部 Supabase。anon key 為 publishable 金鑰,可安全置於前端。

const SUPABASE_URL = "https://cqmmbhxldwfaopenphmr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxbW1iaHhsZHdmYW9wZW5waG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzA0NjYsImV4cCI6MjA5NDc0NjQ2Nn0.oD5N8bRqD233i7DiM4xcBWGKgZP9MyFKEVz_GBb3_ZI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
