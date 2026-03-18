const ACCESS_TOKEN_KEY = "accessToken";

let inMemoryToken: string | null = null;

const canUseStorage = (): boolean => typeof window !== "undefined";

export const getAccessToken = (): string | null => {
  if (canUseStorage()) {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  return inMemoryToken;
};

export const setAccessToken = (token: string): void => {
  inMemoryToken = token;

  if (canUseStorage()) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
};

export const clearAccessToken = (): void => {
  inMemoryToken = null;

  if (canUseStorage()) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};
