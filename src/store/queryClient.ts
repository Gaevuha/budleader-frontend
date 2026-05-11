import { QueryClient } from "@tanstack/react-query";

export const createQueryClient = () => {
  const isBrowser = typeof window !== "undefined";
  const start = isBrowser ? performance.now() : 0;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });

  if (isBrowser) {
    console.debug("[perf] query client init", {
      ms: Math.round(performance.now() - start),
      path: window.location.pathname,
    });
  }

  return queryClient;
};
