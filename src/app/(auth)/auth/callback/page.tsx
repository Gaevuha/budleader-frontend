"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import { Container } from "@/components/layout/Container/Container";
import { toast } from "@/components/UI/notifications/toast";
import { CART_QUERY_KEY } from "@/queries/cartQueries";
import { USER_QUERY_KEY } from "@/queries/authQueries";
import { WISHLIST_QUERY_KEY } from "@/queries/wishlistQueries";
import { publishAuthEvent } from "@/services/authBroadcast";
import {
  resetCommerceRequestCache,
  resetCurrentUserRequestCache,
} from "@/services/apiClient";
import { resolvePostAuthRedirectPath } from "@/services/authRedirect";
import { getCurrentUser } from "@/services/authService";

const OAUTH_ERROR_REDIRECT = "/login?oauth=error";
const SUCCESS_REDIRECT_DELAY_MS = 2800;
const SUCCESS_TOAST_DURATION_MS = 4600;
const ERROR_REDIRECT_DELAY_MS = 1800;
const CALLBACK_TOAST_ID = "google-auth-callback";

type CallbackStatusVariant = "loading" | "success" | "error";

interface CallbackStatusState {
  variant: CallbackStatusVariant;
  message: string;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CallbackStatusState>({
    variant: "loading",
    message: "Авторизація через Google-акаунт...",
  });
  const hasStartedRef = useRef(false);
  const hasSettledToastRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    let isCancelled = false;

    toast.loading("Авторизація через Google-акаунт...", {
      id: CALLBACK_TOAST_ID,
    });

    const finalizeOAuthLogin = async () => {
      const requestedPath = searchParams.get("next");

      try {
        resetCurrentUserRequestCache();
        resetCommerceRequestCache();

        const user = await getCurrentUser();

        if (!user) {
          throw new Error(
            "OAuth callback completed without an authenticated user"
          );
        }

        if (isCancelled) {
          return;
        }

        const nextPath = resolvePostAuthRedirectPath(user.role, requestedPath);

        const resolvedName =
          user.firstName?.trim() || user.name?.trim() || user.email.trim();

        hasSettledToastRef.current = true;
        setStatus({
          variant: "success",
          message:
            user.role === "admin"
              ? "Перенаправляємо до адмін-панелі..."
              : "Перенаправляємо до вашого профілю...",
        });
        toast.success(`Ви зайшли як ${resolvedName}`, {
          id: CALLBACK_TOAST_ID,
          duration: SUCCESS_TOAST_DURATION_MS,
        });

        queryClient.setQueryData(USER_QUERY_KEY, user);
        void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
        publishAuthEvent("login");

        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("budleader-auth-return-to");
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, SUCCESS_REDIRECT_DELAY_MS);
        });

        if (isCancelled) {
          return;
        }

        router.replace(nextPath);
      } catch {
        if (isCancelled) {
          return;
        }

        hasSettledToastRef.current = true;
        setStatus({
          variant: "error",
          message:
            "Не вдалося завершити вхід. Повертаємо на сторінку авторизації...",
        });
        toast.error("Не вдалося завершити вхід через Google", {
          id: CALLBACK_TOAST_ID,
          duration: ERROR_REDIRECT_DELAY_MS + 1800,
        });

        await new Promise((resolve) => {
          window.setTimeout(resolve, ERROR_REDIRECT_DELAY_MS);
        });

        if (isCancelled) {
          return;
        }

        router.replace(OAUTH_ERROR_REDIRECT);
      }
    };

    void finalizeOAuthLogin();

    return () => {
      isCancelled = true;
      if (!hasSettledToastRef.current) {
        toast.dismiss(CALLBACK_TOAST_ID);
      }
    };
  }, [queryClient, router, searchParams]);

  return (
    <Container>
      <section
        style={{
          minHeight: "18vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          aria-live="polite"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {status.message}
        </p>
      </section>
    </Container>
  );
}
