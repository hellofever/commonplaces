import { supabase } from "./supabase";

// The /api/places routes require a signed-in caller (they proxy a paid Google API),
// so every request must carry the Supabase session token.
export async function placesFetch(
  path: "search" | "details",
  body: { query: string } | { placeId: string }
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return fetch(`/api/places/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
