"use client";

import { useSyncExternalStore } from "react";

const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1440;

const MOBILE_QUERY = `(max-width: ${TABLET_BREAKPOINT - 1}px)`;
const TABLET_QUERY = `(min-width: ${TABLET_BREAKPOINT}px) and (max-width: ${
  DESKTOP_BREAKPOINT - 1
}px)`;
const DESKTOP_QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

type BreakpointState = {
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

const getBreakpointState = (width: number): BreakpointState => ({
  width,
  isMobile: width < TABLET_BREAKPOINT,
  isTablet: width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT,
  isDesktop: width >= DESKTOP_BREAKPOINT,
});

const SERVER_BREAKPOINT_SNAPSHOT = getBreakpointState(DESKTOP_BREAKPOINT);

let cachedClientWidth: number | null = null;
let cachedClientSnapshot: BreakpointState | null = null;

const getClientSnapshot = (): BreakpointState => {
  const width = window.innerWidth;

  if (cachedClientSnapshot && cachedClientWidth === width) {
    return cachedClientSnapshot;
  }

  const nextSnapshot = getBreakpointState(width);
  cachedClientWidth = width;
  cachedClientSnapshot = nextSnapshot;

  return nextSnapshot;
};

export function useBreakpoint(): BreakpointState {
  const subscribe = (callback: () => void) => {
    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const tabletQuery = window.matchMedia(TABLET_QUERY);
    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const mediaQueries = [mobileQuery, tabletQuery, desktopQuery];

    window.addEventListener("resize", callback);
    mediaQueries.forEach((query) => {
      query.addEventListener("change", callback);
    });

    return () => {
      window.removeEventListener("resize", callback);
      mediaQueries.forEach((query) => {
        query.removeEventListener("change", callback);
      });
    };
  };

  return useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    () => SERVER_BREAKPOINT_SNAPSHOT
  );
}
