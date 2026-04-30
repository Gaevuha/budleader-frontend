"use client";

import type { CSSProperties, ButtonHTMLAttributes, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/UI/Button/Button";
import { AUTH_API_URL } from "@/services/api";
import styles from "./OAuthLoginButton.module.css";

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

type OAuthProvider = "google" | "facebook";

type OAuthButtonStyleVars = CSSProperties & {
  "--oauth-accent"?: string;
  "--oauth-accent-soft"?: string;
  "--oauth-accent-border"?: string;
};

interface OAuthLoginButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  provider: OAuthProvider;
  children?: ReactNode;
}

type OAuthProviderConfig = {
  label: string;
  icon: ReactNode;
  style: OAuthButtonStyleVars;
};

const GoogleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className={styles.icon}
  >
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.24 1.25-.95 2.3-2.02 3.01l3.27 2.54c1.9-1.75 3-4.34 3-7.44 0-.71-.06-1.39-.18-2.04H12z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.27-2.54c-.91.61-2.08.98-3.35.98-2.58 0-4.76-1.74-5.54-4.08H3.08v2.63A9.99 9.99 0 0 0 12 22z"
    />
    <path
      fill="#4A90E2"
      d="M6.46 13.92A5.98 5.98 0 0 1 6.15 12c0-.67.11-1.32.31-1.92V7.45H3.08A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.55l3.38-2.63z"
    />
    <path
      fill="#FBBC05"
      d="M12 5.98c1.47 0 2.8.5 3.85 1.48l2.89-2.89C16.95 2.91 14.69 2 12 2a10 10 0 0 0-8.92 5.45l3.38 2.63C7.24 7.72 9.42 5.98 12 5.98z"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className={styles.icon}
  >
    <rect x="1.5" y="1.5" width="21" height="21" rx="10.5" fill="#1877F2" />
    <path
      fill="#fff"
      d="M13.32 20v-6.34h2.13l.32-2.47h-2.45V9.61c0-.71.2-1.19 1.22-1.19h1.31V6.2c-.23-.03-1-.1-1.9-.1-1.88 0-3.16 1.15-3.16 3.25v1.84H8.67v2.47h2.12V20h2.53z"
    />
  </svg>
);

const OAUTH_PROVIDER_CONFIG: Record<OAuthProvider, OAuthProviderConfig> = {
  google: {
    label: "Google",
    icon: <GoogleIcon />,
    style: {
      "--oauth-accent": "#4285f4",
      "--oauth-accent-soft": "rgba(66, 133, 244, 0.08)",
      "--oauth-accent-border": "rgba(66, 133, 244, 0.26)",
    },
  },
  facebook: {
    label: "Facebook",
    icon: <FacebookIcon />,
    style: {
      "--oauth-accent": "#1877f2",
      "--oauth-accent-soft": "rgba(24, 119, 242, 0.1)",
      "--oauth-accent-border": "rgba(24, 119, 242, 0.28)",
    },
  },
};

export function OAuthLoginButton({
  provider,
  children,
  onClick,
  type = "button",
  ...props
}: OAuthLoginButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const config = OAUTH_PROVIDER_CONFIG[provider];

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

    window.location.assign(`${AUTH_API_URL}/${provider}?${search.toString()}`);
  };

  return (
    <Button type={type} onClick={handleClick} style={config.style} {...props}>
      <span className={styles.content}>
        <span className={styles.iconWrap}>{config.icon}</span>
        <span className={styles.label}>{children ?? config.label}</span>
      </span>
    </Button>
  );
}
