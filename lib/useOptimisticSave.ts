"use client";

import { useState } from "react";

interface OptimisticSaveOptions<T> {
  apply: () => void;
  revert: () => void;
  write: () => Promise<T>;
  onSuccess?: (result: T) => void;
}

// Shared shape for every write flow: apply the known result locally right away, fire
// the Supabase call in the background, and revert + flag an error if it fails. Keyed
// by an arbitrary string id so unrelated concurrent edits (e.g. two different tags'
// colors) track pending/error state independently.
export function useOptimisticSave() {
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());

  async function run<T>(key: string, { apply, revert, write, onSuccess }: OptimisticSaveOptions<T>) {
    setErrorKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setPendingKeys((prev) => new Set(prev).add(key));
    apply();
    try {
      const result = await write();
      onSuccess?.(result);
    } catch (err) {
      console.error(err);
      revert();
      setErrorKeys((prev) => new Set(prev).add(key));
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  return {
    run,
    isPending: (key: string) => pendingKeys.has(key),
    isError: (key: string) => errorKeys.has(key),
  };
}
