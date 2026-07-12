import { createClient } from "@supabase/supabase-js";

// Fall back to placeholders so `next build` doesn't crash before .env.local is configured --
// createClient() throws synchronously on an empty string, which would fail SSR of client
// components that import this module. Real calls just fail gracefully at runtime instead.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
