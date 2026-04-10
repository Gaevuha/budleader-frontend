import { parseCatalogViewMode } from "@/services/catalogViewPreference";
import { ApiFetchError, AUTH_API_URL } from "@/services/api";
import { parseThemeMode } from "@/services/themePreference";
import type { User } from "@/types/auth";

const parseJson = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const extractMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const nestedError =
    record.error && typeof record.error === "object"
      ? (record.error as Record<string, unknown>)
      : null;

  if (typeof nestedError?.message === "string" && nestedError.message.trim()) {
    return nestedError.message;
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  return fallback;
};

const normalizeUser = (
  raw: User & {
    _id?: string;
    name?: string;
    theme?: unknown;
    catalogViewMode?: unknown;
  }
): User => ({
  ...raw,
  id: raw.id ?? raw._id ?? "",
  firstName: raw.firstName ?? raw.name,
  theme: parseThemeMode(raw.theme) ?? undefined,
  catalogViewMode: parseCatalogViewMode(raw.catalogViewMode) ?? undefined,
});

const unwrapUser = (payload: unknown): User | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidate =
    (record.user as User | null | undefined) ??
    (record.data as User | null | undefined) ??
    (payload as User | null);

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return normalizeUser(candidate as User & { _id?: string; name?: string });
};

export async function getCurrentUser(): Promise<User | null> {
  const response = await fetch(`${AUTH_API_URL}/me`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await parseJson(response);

  if (response.status === 401) {
    throw new ApiFetchError(
      extractMessage(payload, "Not authenticated"),
      response.status,
      payload
    );
  }

  if (!response.ok) {
    throw new ApiFetchError(
      extractMessage(payload, "Failed to load current user"),
      response.status,
      payload
    );
  }

  return unwrapUser(payload);
}

export async function logout(): Promise<void> {
  const response = await fetch(`${AUTH_API_URL}/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  const payload = await parseJson(response);

  if (response.status === 401) {
    throw new ApiFetchError(
      extractMessage(payload, "Not authenticated"),
      response.status,
      payload
    );
  }

  if (!response.ok) {
    throw new ApiFetchError(
      extractMessage(payload, "Failed to log out"),
      response.status,
      payload
    );
  }
}
