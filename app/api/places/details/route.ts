import { requireUser } from "../requireUser";

export const dynamic = "force-dynamic";

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface PlaceDetailsResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  priceLevel?: string;
  regularOpeningHours?: { periods?: unknown[] };
  primaryType?: string;
}

export async function POST(request: Request) {
  const unauthorized = await requireUser(request);
  if (unauthorized) return unauthorized;

  let placeId: unknown;
  try {
    ({ placeId } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!placeId || typeof placeId !== "string") {
    return Response.json({ error: "Missing placeId" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GOOGLE_PLACES_API_KEY is not set" }, { status: 500 });
  }

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "id",
          "displayName",
          "formattedAddress",
          "location",
          "internationalPhoneNumber",
          "websiteUri",
          "priceLevel",
          "regularOpeningHours",
          "primaryType",
        ].join(","),
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    // Google's error bodies can include project/request details -- keep them
    // server-side and return only a generic message.
    console.error("Places details failed:", res.status, await res.text());
    return Response.json({ error: "Places details failed" }, { status: 502 });
  }

  const p = (await res.json()) as PlaceDetailsResult;

  return Response.json({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.internationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    priceLevel: p.priceLevel ? PRICE_LEVEL_MAP[p.priceLevel] ?? null : null,
    openingHours: p.regularOpeningHours?.periods ?? null,
    primaryType: p.primaryType ?? null,
  });
}
