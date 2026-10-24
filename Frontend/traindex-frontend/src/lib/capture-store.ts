import { useSyncExternalStore } from "react";
import type { MatchResult } from "./match-mock";

// Holds the in-progress capture. Persisted to localStorage so it survives
// the magic-link sign-in round trip (which opens a new tab).
export interface PendingCapture {
  dataUrl: string;
  match: MatchResult | null;
  targetId?: string | undefined;
  /** ISO timestamp of the moment the shutter fired. Printed on the card. */
  capturedAt?: string | undefined;
}

const KEY = "rollsign-pending-capture";
let state: PendingCapture | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {
    state = null;
  }
}

export function setCapture(next: PendingCapture | null) {
  state = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage full: keep in memory */
  }
  listeners.forEach((l) => l());
}

export function updateCapture(patch: Partial<PendingCapture>) {
  if (state) setCapture({ ...state, ...patch });
}

export function useCapture(): PendingCapture | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => null,
  );
}

export async function dataUrlToBlob(dataUrl: string) {
  return (await fetch(dataUrl)).blob();
}
