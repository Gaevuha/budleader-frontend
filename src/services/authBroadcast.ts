"use client";

export type AuthBroadcastEventType =
  | "login"
  | "register"
  | "logout"
  | "logout-all";

export interface AuthBroadcastEvent {
  type: AuthBroadcastEventType;
  at: number;
}

const AUTH_CHANNEL_NAME = "budleader-auth";

const canUseBroadcastChannel = (): boolean => {
  return typeof window !== "undefined" && "BroadcastChannel" in window;
};

export const createAuthBroadcastChannel = (): BroadcastChannel | null => {
  if (!canUseBroadcastChannel()) {
    return null;
  }

  return new BroadcastChannel(AUTH_CHANNEL_NAME);
};

export const publishAuthEvent = (type: AuthBroadcastEventType): void => {
  const channel = createAuthBroadcastChannel();

  if (!channel) {
    return;
  }

  channel.postMessage({
    type,
    at: Date.now(),
  } satisfies AuthBroadcastEvent);

  channel.close();
};
