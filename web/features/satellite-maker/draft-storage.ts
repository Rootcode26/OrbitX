import type { SatelliteDraft } from "./types";

const storageKey = "orbitx:satellite-maker-drafts";
const legacyStorageKey = "orbitwatch:satellite-maker-drafts";
const emptyDrafts: SatelliteDraft[] = [];
const listeners = new Set<() => void>();

let cachedValue: string | null | undefined;
let cachedDrafts = emptyDrafts;

function parseDrafts(value: string | null): SatelliteDraft[] {
  if (!value) return emptyDrafts;

  try {
    const drafts: unknown = JSON.parse(value);
    if (!Array.isArray(drafts)) return emptyDrafts;

    return drafts.filter((draft): draft is SatelliteDraft => (
      typeof draft === "object"
      && draft !== null
      && "id" in draft
      && typeof draft.id === "number"
      && "config" in draft
      && typeof draft.config === "object"
      && draft.config !== null
      && "orbit" in draft
      && typeof draft.orbit === "object"
      && draft.orbit !== null
    ));
  } catch {
    return emptyDrafts;
  }
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function handleStorageChange(event: StorageEvent) {
  if (event.key !== storageKey && event.key !== legacyStorageKey) return;
  cachedValue = event.newValue;
  cachedDrafts = parseDrafts(event.newValue);
  notifyListeners();
}

export function subscribeToSatelliteDrafts(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", handleStorageChange);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorageChange);
  };
}

export function getSatelliteDraftsSnapshot() {
  const storedValue = window.localStorage.getItem(storageKey)
    ?? window.localStorage.getItem(legacyStorageKey);
  if (storedValue === cachedValue) return cachedDrafts;

  cachedValue = storedValue;
  cachedDrafts = parseDrafts(storedValue);
  return cachedDrafts;
}

export function getSatelliteDraftsServerSnapshot() {
  return emptyDrafts;
}

export function addSatelliteDraft(draft: SatelliteDraft) {
  const drafts = [...getSatelliteDraftsSnapshot(), draft];
  cachedValue = JSON.stringify(drafts);
  cachedDrafts = drafts;
  window.localStorage.setItem(storageKey, cachedValue);
  window.localStorage.removeItem(legacyStorageKey);
  notifyListeners();
}

export function removeSatelliteDraft(draftId: number) {
  const drafts = getSatelliteDraftsSnapshot().filter((draft) => draft.id !== draftId);
  cachedValue = JSON.stringify(drafts);
  cachedDrafts = drafts;
  window.localStorage.setItem(storageKey, cachedValue);
  window.localStorage.removeItem(legacyStorageKey);
  notifyListeners();
}
