import { apiFetch } from "@/services/api";
import type { ThemeMode } from "@/types/app";

export interface ThemePreferenceResponse {
  theme: ThemeMode;
}

export async function updateThemePreferenceCSR(
  theme: ThemeMode
): Promise<ThemePreferenceResponse> {
  return apiFetch<ThemePreferenceResponse>("/api/proxy/api/users/theme", {
    method: "PUT",
    body: { theme },
  });
}
