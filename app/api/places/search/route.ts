import { requireUser } from "../requireUser";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 200;

interface PlacesTextSearchResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryType?: string;
}

export async function POST(request: Request) {
  const unauthorized = await requireUser(request);
  if (unauthorized) return unauthorized;

  let query: unknown;
  try {
    ({ query } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!query || typeof query !== "string" || query.length > MAX_QUERY_LENGTH) {
    return Response.json({ error: "Missing or invalid query" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GOOGLE_PLACES_API_KEY is not set" }, { status: 500 });
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType",
    },
    body: JSON.stringify({ textQuery: query }),
    cache: "no-store",
  });

  if (!res.ok) {
    // Google's error bodies can include project/request details -- keep them
    // server-side and return only a generic message.
    console.error("Places search failed:", res.status, await res.text());
    return Response.json({ error: "Places search failed" }, { status: 502 });
  }

  const data = (await res.json()) as { places?: PlacesTextSearchResult[] };

  const results = (data.places ?? []).slice(0, 5).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    primaryType: p.primaryType ?? null,
  }));

  return Response.json({ results });
}
