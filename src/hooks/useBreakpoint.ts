"use client";

import { useEffect, useState } from "react";

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

export function useBreakpoint(): BreakpointState {
  const [breakpoint, setBreakpoint] = useState<BreakpointState>(() =>
    getBreakpointState(375)
  );

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const tabletQuery = window.matchMedia(TABLET_QUERY);
    const desktopQuery = window.matchMedia(DESKTOP_QUERY);

    const updateBreakpoint = () => {
      setBreakpoint(getBreakpointState(window.innerWidth));
    };

    const mediaQueries = [mobileQuery, tabletQuery, desktopQuery];

    updateBreakpoint();

    mediaQueries.forEach((query) => {
      query.addEventListener("change", updateBreakpoint);
    });

    return () => {
      mediaQueries.forEach((query) => {
        query.removeEventListener("change", updateBreakpoint);
      });
    };
  }, []);

  return breakpoint;
}
