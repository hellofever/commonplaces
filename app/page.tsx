"use client";

import { useSearchParams } from "next/navigation";
import { MapView } from "@/components/MapView";

export default function MapPage() {
  const searchParams = useSearchParams();
  return (
    <MapView
      focusPlaceId={searchParams.get("place")}
      typeIds={(searchParams.get("types") ?? "").split(",").filter(Boolean)}
      tagIds={(searchParams.get("tags") ?? "").split(",").filter(Boolean)}
      areaIds={(searchParams.get("areas") ?? "").split(",").filter(Boolean)}
    />
  );
}
