"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import styles from "./AuthModal.module.css";

import {
  useForgotPassword,
  useLogin,
  useRegister,
} from "@/queries/authQueries";
import { getApiErrorMessage } from "@/services/api";
import { getOAuthRedirectUrl } from "@/services/apiClient";
import { useAuthModalStore } from "@/store/ui/authModalStore";
import type { AuthModalMode } from "@/types/auth";

const TITLE_BY_MODE: Record<AuthModalMode, string> = {
  login: "Вхід в систему",
  register: "Реєстрація",
  forgot: "Відновлення пароля",
};

export const AuthModal = () => {
  const { isOpen, mode, open, close } = useAuthModalStore();
  const router = useRouter();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const forgotPasswordMutation = useForgotPassword();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isSubmitting =
    loginMutation.isPending ||
    registerMutation.isPending ||
    forgotPasswordMutation.isPending;

  const mutationError = useMemo(() => {
    if (mode === "login") {
      return loginMutation.error;
    }

    if (mode === "register") {
      return registerMutation.error;
    }

    return forgotPasswordMutation.error;
  }, [
    forgotPasswordMutation.error,
    loginMutation.error,
    mode,
    registerMutation.error,
  ]);

  if (!isOpen) return null;

  const closeModal = () => {
    close();
  };

  const redirectAfterAuth = (role?: string) => {
    close();
    router.push(role === "admin" ? "/admin/dashboard" : "/profile");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    try {
      if (mode === "login") {
        const result = await loginMutation.mutateAsync({
          email: email.trim(),
          password,
        });

        toast.success("Вхід виконано успішно");
        redirectAfterAuth(result.user.role);
        return;
      }

      if (mode === "register") {
        if (password !== confirmPassword) {
          toast.error("Паролі не співпадають");
          return;
        }

        const result = await registerMutation.mutateAsync({
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
        });

        toast.success("Реєстрація виконана успішно");
        redirectAfterAuth(result.user.role);
        return;
      }

      await forgotPasswordMutation.mutateAsync({
        email: email.trim(),
      });

      toast.success("Інструкції для відновлення надіслані на email");
      open("login");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Не вдалося виконати запит"));
    }
  };

  const handleOAuthRedirect = (provider: "google" | "facebook") => {
    window.location.assign(getOAuthRedirectUrl(provider));
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={styles.modal}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
        >
          <button className={styles.closeBtn} onClick={closeModal}>
            <X size={24} />
          </button>

          <h2 className={styles.title}>{TITLE_BY_MODE[mode]}</h2>

          <form className={styles.form} onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <div className={styles.formGroup}>
                  <label>Ім&apos;я</label>
                  <input
                    type="text"
                    placeholder="Ваше ім'я"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Прізвище</label>
                  <input
                    type="text"
                    placeholder="Ваше прізвище"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Телефон</label>
                  <input
                    type="tel"
                    placeholder="+380..."
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
              </>
            )}

            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== "forgot" ? (
              <>
                <div className={styles.formGroup}>
                  <label>Пароль</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {mode === "register" && (
                  <div className={styles.formGroup}>
                    <label>Підтвердження пароля</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      required
                    />
                  </div>
                )}
              </>
            ) : null}

            {mode === "login" && (
              <div className={styles.formGroup}>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => open("forgot")}
                >
                  Забули пароль?
                </button>
              </div>
            )}

            {mutationError ? (
              <p className={styles.error}>
                {getApiErrorMessage(mutationError, "Не вдалося виконати запит")}
              </p>
            ) : null}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {mode === "login"
                ? "Увійти"
                : mode === "register"
                ? "Зареєструватися"
                : "Надіслати інструкції"}
            </button>
          </form>

          {mode !== "forgot" ? (
            <div className={styles.oauthSection}>
              <p className={styles.helperText}>Або продовжити через</p>
              <div className={styles.oauthButtons}>
                <button
                  type="button"
                  className={styles.oauthButton}
                  onClick={() => handleOAuthRedirect("google")}
                >
                  Google
                </button>
                <button
                  type="button"
                  className={styles.oauthButton}
                  onClick={() => handleOAuthRedirect("facebook")}
                >
                  Facebook
                </button>
              </div>
            </div>
          ) : null}

          <div className={styles.switchMode}>
            {mode === "login" ? "Немає акаунту? " : null}
            {mode === "register" ? "Вже зареєстровані? " : null}
            {mode !== "forgot" ? (
              <button
                type="button"
                onClick={() => open(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Зареєструватися" : "Увійти"}
              </button>
            ) : (
              <button type="button" onClick={() => open("login")}>
                Повернутися до входу
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
