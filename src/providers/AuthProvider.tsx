"use client";

import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types/auth";

interface AuthProviderProps extends PropsWithChildren {
  initialUser: User | null;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const authQuery = useAuth({ initialData: initialUser });
  const user = authQuery.data ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading: authQuery.isPending && !user,
    }),
    [authQuery.isPending, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }

  return context;
}
