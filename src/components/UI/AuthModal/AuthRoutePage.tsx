"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Container } from "@/components/layout/Container/Container";
import Loader from "@/components/UI/Loader/Loader";
import { useUser } from "@/queries/authQueries";
import { useAuthModalStore } from "@/store/ui/authModalStore";
import type { AuthModalMode } from "@/types/auth";

interface AuthRoutePageProps {
  mode: AuthModalMode;
}

const TITLE_BY_MODE: Record<AuthModalMode, string> = {
  login: "Вхід",
  register: "Реєстрація",
  forgot: "Відновлення пароля",
};

export function AuthRoutePage({ mode }: AuthRoutePageProps) {
  const router = useRouter();
  const userQuery = useUser();
  const open = useAuthModalStore((state) => state.open);
  const close = useAuthModalStore((state) => state.close);

  useEffect(() => {
    if (userQuery.data) {
      return;
    }

    if (typeof window !== "undefined") {
      const referrer = document.referrer;

      if (referrer) {
        try {
          const referrerUrl = new URL(referrer);

          if (referrerUrl.origin === window.location.origin) {
            const returnTo = `${referrerUrl.pathname}${referrerUrl.search}`;

            if (
              returnTo &&
              !["/login", "/register", "/forgot-password"].includes(
                referrerUrl.pathname
              )
            ) {
              window.sessionStorage.setItem(
                "budleader-auth-return-to",
                returnTo
              );
            }
          }
        } catch {
          // Ignore malformed referrers.
        }
      }
    }

    open(mode);
    return () => {
      close();
    };
  }, [close, mode, open, userQuery.data]);

  useEffect(() => {
    if (!userQuery.data) {
      return;
    }

    if (userQuery.data.role === "admin") {
      router.replace("/admin/dashboard");
      return;
    }

    const storedReturnTo =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("budleader-auth-return-to")
        : null;

    if (storedReturnTo && storedReturnTo.startsWith("/")) {
      router.replace(storedReturnTo);
      return;
    }

    router.replace("/");
  }, [router, userQuery.data]);

  return (
    <Container>
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          textAlign: "center",
        }}
      >
        <Loader />
        <h1>{TITLE_BY_MODE[mode]}</h1>
        <p>Відкриваємо форму авторизації...</p>
      </div>
    </Container>
  );
}
