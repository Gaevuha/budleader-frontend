"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useAuthStore } from "@/store/auth/authStore";

interface ProvidersProps {
  children: ReactNode;
}

let bootstrapStarted = false;

function AppBootstrap() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    if (bootstrapStarted) {
      return;
    }

    bootstrapStarted = true;

    const init = async () => {
      try {
        await initializeAuth();
      } catch {
        // User is not authenticated or session is expired.
      }
    };

    void init();
  }, [initializeAuth]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchMe();
  }, [accessToken, fetchMe]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppBootstrap />
      {children}
    </QueryClientProvider>
  );
}
