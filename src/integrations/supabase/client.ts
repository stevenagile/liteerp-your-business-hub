// Canonical browser Supabase client lives at @/lib/supabase.
// This re-export keeps existing integrations/ imports working.
// New code should import from "@/lib/supabase" directly.
export { supabase } from "@/lib/supabase";
