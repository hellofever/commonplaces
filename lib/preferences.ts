import { useSyncExternalStore } from "react";

// Device-local UI preferences -- localStorage-backed, deliberately not synced through
// Supabase (unlike everything in AppShell's RestaurantUIContext): these are per-device
// display choices, not shared app data, so each person's device keeps its own setting.
// useSyncExternalStore (not a Context/Provider) so any component can read/write this
// without a wrapping provider, and every consumer re-renders together the moment one of
// them calls the setter -- same live-update requirement next-themes solves for
// Appearance, just without needing next-themes' own machinery for a single boolean.

const CLUSTERING_KEY = "commonplaces:map-clustering-enabled";

const listeners = new Set<() => void>();
let cachedClustering: boolean | null = null;

function readClustering(): boolean {
  const raw = window.localStorage.getItem(CLUSTERING_KEY);
  return raw === null ? true : raw === "1";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getClusteringSnapshot() {
  if (cachedClustering === null) cachedClustering = readClustering();
  return cachedClustering;
}

// Clustering defaults on for SSR/first paint -- matches the client default once
// localStorage is read, so there's no flash of markers un-clustering right after mount.
function getClusteringServerSnapshot() {
  return true;
}

export function setClusteringEnabled(next: boolean) {
  cachedClustering = next;
  window.localStorage.setItem(CLUSTERING_KEY, next ? "1" : "0");
  listeners.forEach((listener) => listener());
}

export function useClusteringEnabled(): [boolean, (next: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, getClusteringSnapshot, getClusteringServerSnapshot);
  return [enabled, setClusteringEnabled];
}
