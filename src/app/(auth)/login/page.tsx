"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Container } from "@/components/layout/Container/Container";
import { useAuthStore } from "@/store/auth/authStore";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });

      const role = useAuthStore.getState().user?.role;

      if (role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/profile");
      }
    } catch {
      setError("Не вдалося увійти. Перевірте дані та спробуйте ще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Вхід</h1>
        <p className={styles.subtitle}>Увійдіть у свій акаунт</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
          />

          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Пароль"
            required
          />

          <button
            className={styles.submit}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Вхід..." : "Увійти"}
          </button>
        </form>

        {error ? <p className={styles.error}>{error}</p> : null}

        <p className={styles.linkRow}>
          Немає акаунта? <Link href="/register">Зареєструватися</Link>
        </p>
      </div>
    </Container>
  );
}
