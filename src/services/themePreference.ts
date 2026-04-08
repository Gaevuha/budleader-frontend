import type { ThemeMode } from "@/types/app";

export const THEME_COOKIE_NAME = "budleader-theme";
export const THEME_STORAGE_KEY = "budleader-theme";
export const DEFAULT_THEME_MODE: ThemeMode = "light";
const SYSTEM_THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export const isThemeMode = (value: unknown): value is ThemeMode => {
  return value === "light" || value === "dark";
};

export const parseThemeMode = (value: unknown): ThemeMode | null => {
  return isThemeMode(value) ? value : null;
};

export const resolveThemeFromCookieHeader = (
  cookieHeader: string | null | undefined
): ThemeMode | null => {
  if (!cookieHeader) {
    return null;
  }

  const themeCookie = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${THEME_COOKIE_NAME}=`));

  if (!themeCookie) {
    return null;
  }

  const rawValue = themeCookie.slice(THEME_COOKIE_NAME.length + 1);
  return parseThemeMode(decodeURIComponent(rawValue));
};

export const normalizeThemeMode = (value: unknown): ThemeMode => {
  return isThemeMode(value) ? value : DEFAULT_THEME_MODE;
};

export const getSystemThemeMode = (): ThemeMode => {
  if (
    typeof window !== "undefined" &&
    window.matchMedia(SYSTEM_THEME_MEDIA_QUERY).matches
  ) {
    return "dark";
  }

  return "light";
};

export const readStoredThemeMode = (): ThemeMode | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
};

const writeThemeCookie = (theme: ThemeMode) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(
    theme
  )}; path=/; max-age=31536000; samesite=lax`;
};

export const persistThemeMode = (theme: ThemeMode) => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures and still keep document state in sync.
    }
  }

  writeThemeCookie(theme);
};

export const resolveClientThemeMode = (
  fallback: ThemeMode = DEFAULT_THEME_MODE
): ThemeMode => {
  return readStoredThemeMode() ?? getSystemThemeMode() ?? fallback;
};

export const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};

export const buildGuestThemeBootstrapScript = (
  fallbackTheme: ThemeMode
): string => {
  return `(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  const cookieName = ${JSON.stringify(THEME_COOKIE_NAME)};
  const fallbackTheme = ${JSON.stringify(fallbackTheme)};
  const isThemeMode = (value) => value === "light" || value === "dark";

  let storedTheme = null;

  try {
    storedTheme = window.localStorage.getItem(storageKey);
  } catch {
    storedTheme = null;
  }

  const systemTheme = window.matchMedia("${SYSTEM_THEME_MEDIA_QUERY}").matches
    ? "dark"
    : "light";
  const theme = isThemeMode(storedTheme)
    ? storedTheme
    : systemTheme ?? (isThemeMode(fallbackTheme) ? fallbackTheme : "light");
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.cookie = cookieName + "=" + encodeURIComponent(theme) + "; path=/; max-age=31536000; samesite=lax";
})();`;
};
