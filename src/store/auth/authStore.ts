"use client";

import { create } from "zustand";

import { logout as logoutRequest } from "@/services/api";
import type { User } from "@/types/auth";

interface AuthStore {
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User | null) => void;
  hydrate: (user: User | null) => void;
  clear: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,
  login: (user) =>
    set({
      isAuthenticated: Boolean(user),
      user,
    }),
  hydrate: (user) =>
    set({
      isAuthenticated: Boolean(user),
      user,
    }),
  clear: () =>
    set({
      isAuthenticated: false,
      user: null,
    }),
  logout: async () => {
    await logoutRequest();
    set({
      isAuthenticated: false,
      user: null,
    });
  },
}));
