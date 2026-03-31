const ACCESS_TOKEN_KEY = "accessToken";
const ROLE_KEY = "role";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

let inMemoryToken: string | null = null;
let inMemoryRole: string | null = null;

const canUseStorage = (): boolean => typeof window !== "undefined";

const isValidToken = (token: string | null | undefined): token is string => {
  if (typeof token !== "string") {
    return false;
  }

  const normalized = token.trim();
  return (
    normalized.length > 0 && normalized !== "undefined" && normalized !== "null"
  );
};

const setBrowserCookie = (name: string, value: string): void => {
  if (!canUseStorage()) {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
};

const removeBrowserCookie = (name: string): void => {
  if (!canUseStorage()) {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
};

export const getAccessToken = (): string | null => {
  if (canUseStorage()) {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    return isValidToken(token) ? token : null;
  }

  return isValidToken(inMemoryToken) ? inMemoryToken : null;
};

export const setAccessToken = (token: string): void => {
  if (!isValidToken(token)) {
    clearAccessToken();
    return;
  }

  inMemoryToken = token;

  if (canUseStorage()) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    setBrowserCookie(ACCESS_TOKEN_KEY, token);
  }
};

export const clearAccessToken = (): void => {
  inMemoryToken = null;

  if (canUseStorage()) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    removeBrowserCookie(ACCESS_TOKEN_KEY);
  }
};

export const setRole = (role: string): void => {
  inMemoryRole = role;
  setBrowserCookie(ROLE_KEY, role);
};

export const getRole = (): string | null => {
  return inMemoryRole;
};

export const clearRole = (): void => {
  inMemoryRole = null;
  removeBrowserCookie(ROLE_KEY);
};
