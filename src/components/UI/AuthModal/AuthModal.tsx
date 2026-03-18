"use client";

import { useState } from "react";
import { X } from "lucide-react";
import styles from "./AuthModal.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth/authStore";

export const AuthModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const login = useAuthStore((state) => state.login);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email, password });
      onClose();
    } catch {
      toast.error("Не вдалося увійти. Перевірте дані або спробуйте пізніше");
    } finally {
      setIsSubmitting(false);
    }
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
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>

          <h2 className={styles.title}>
            {isLogin ? "Вхід в систему" : "Реєстрація"}
          </h2>

          <form className={styles.form} onSubmit={handleSubmit}>
            {!isLogin && (
              <div className={styles.formGroup}>
                <label>Ім&apos;я</label>
                <input type="text" placeholder="Ваше ім'я" required />
              </div>
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

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isLogin ? "Увійти" : "Зареєструватися"}
            </button>
          </form>

          <div className={styles.switchMode}>
            {isLogin ? "Немає акаунту? " : "Вже зареєстровані? "}
            <button onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Зареєструватися" : "Увійти"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
