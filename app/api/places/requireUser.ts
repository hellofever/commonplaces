import { createClient } from "@supabase/supabase-js";

// The Places routes proxy a paid Google API, so they must not be callable
// anonymously -- verify the caller's Supabase session token before spending quota.
// Returns an error Response to short-circuit with, or null when the caller is valid.
export async function requireUser(request: Request): Promise<Response | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return Response.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
