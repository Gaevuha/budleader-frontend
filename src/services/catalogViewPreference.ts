import type { CatalogViewMode } from "@/types/app";

export const CATALOG_VIEW_COOKIE_NAME = "budleader-catalog-view";
export const CATALOG_VIEW_STORAGE_KEY = "budleader-catalog-view";
export const DEFAULT_CATALOG_VIEW_MODE: CatalogViewMode = "grid";

export const isCatalogViewMode = (value: unknown): value is CatalogViewMode => {
  return value === "grid" || value === "list";
};

export const parseCatalogViewMode = (
  value: unknown
): CatalogViewMode | null => {
  return isCatalogViewMode(value) ? value : null;
};

export const readStoredCatalogViewMode = (): CatalogViewMode | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseCatalogViewMode(
      window.localStorage.getItem(CATALOG_VIEW_STORAGE_KEY)
    );
  } catch {
    return null;
  }
};

export const persistCatalogViewMode = (viewMode: CatalogViewMode) => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, viewMode);
    } catch {
      // Ignore storage failures and still keep cookie in sync.
    }
  }

  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${CATALOG_VIEW_COOKIE_NAME}=${encodeURIComponent(
    viewMode
  )}; path=/; max-age=31536000; samesite=lax`;
};
