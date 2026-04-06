"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/UI/Button/Button";
import { useResetPassword } from "@/queries/authQueries";
import { getApiErrorMessage } from "@/services/api";

interface ResetPasswordPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ResetPasswordPage({
  params,
}: ResetPasswordPageProps) {
  const resolvedParams = await params;

  return <ResetPasswordClient token={resolvedParams.token} />;
}

function ResetPasswordClient({ token }: { token: string }) {
  const router = useRouter();
  const resetPasswordMutation = useResetPassword(token);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Паролі не співпадають");
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        password,
        confirmPassword,
      });

      toast.success("Пароль успішно змінено");
      router.push("/login");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Не вдалося змінити пароль. Спробуйте ще раз")
      );
    }
  };

  return (
    <Container>
      <div
        style={{
          maxWidth: 420,
          margin: "48px auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h1>Створити новий пароль</h1>
        <p>Введіть новий пароль для вашого акаунта.</p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            type="password"
            placeholder="Новий пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Підтвердіть пароль"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            disabled={resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending
              ? "Зберігаємо..."
              : "Змінити пароль"}
          </Button>
        </form>
      </div>
    </Container>
  );
}
