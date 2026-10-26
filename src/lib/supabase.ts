import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Re-export Database schema types for convenience.
// Usage: import { supabase, type Tables } from "@/lib/supabase";
export type { Database };
export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "@/integrations/supabase/types";

// LiteERP — single canonical browser Supabase client.
// Reads credentials from Vite env vars; the anon key is a publishable key
// safe for the frontend.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Please copy .env.example to .env.local and fill in your project credentials.",
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
