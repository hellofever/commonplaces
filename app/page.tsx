"use client";

import { useSearchParams } from "next/navigation";
import { MapView } from "@/components/MapView";

export default function MapPage() {
  const searchParams = useSearchParams();
  return <MapView query={searchParams.get("q") ?? ""} focusPlaceId={searchParams.get("place")} />;
}
