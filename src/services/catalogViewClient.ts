import { apiFetch } from "@/services/api";
import type { CatalogViewMode } from "@/types/app";

export interface CatalogViewPreferenceResponse {
  catalogViewMode: CatalogViewMode;
}

export async function updateCatalogViewPreferenceCSR(
  catalogViewMode: CatalogViewMode
): Promise<CatalogViewPreferenceResponse> {
  return apiFetch<CatalogViewPreferenceResponse>(
    "/api/proxy/api/users/catalog-view",
    {
      method: "PUT",
      body: { catalogViewMode },
    }
  );
}
