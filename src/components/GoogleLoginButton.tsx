"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/UI/Button/Button";
import { AUTH_API_URL } from "@/services/api";

const AUTH_ROUTE_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
]);

const DEFAULT_RETURN_PATH = "/profile";

const sanitizeReturnPath = (
  value: string | null | undefined
): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
};

interface GoogleLoginButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export function GoogleLoginButton({
  children = "Login with Google",
  onClick,
  type = "button",
  ...props
}: GoogleLoginButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolveReturnPath = (): string => {
    const currentSearch = searchParams?.toString();
    const currentPath = sanitizeReturnPath(
      pathname
        ? `${pathname}${currentSearch ? `?${currentSearch}` : ""}`
        : undefined
    );

    if (currentPath && !AUTH_ROUTE_PATHS.has(pathname)) {
      return currentPath;
    }

    const storedReturnPath = sanitizeReturnPath(
      typeof window === "undefined"
        ? null
        : window.sessionStorage.getItem("budleader-auth-return-to")
    );

    return storedReturnPath ?? DEFAULT_RETURN_PATH;
  };

  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] = (
    event
  ) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const search = new URLSearchParams({
      state: resolveReturnPath(),
    });

    window.location.assign(`${AUTH_API_URL}/google?${search.toString()}`);
  };

  return (
    <Button type={type} onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}
