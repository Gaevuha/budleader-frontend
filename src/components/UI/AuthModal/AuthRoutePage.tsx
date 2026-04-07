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

    open(mode);
    return () => {
      close();
    };
  }, [close, mode, open, userQuery.data]);

  useEffect(() => {
    if (!userQuery.data) {
      return;
    }

    router.replace(
      userQuery.data.role === "admin" ? "/admin/dashboard" : "/profile"
    );
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
