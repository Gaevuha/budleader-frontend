"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { createQuickOrderCSR } from "@/services/apiClient";
import type { AppProduct } from "@/types/app";
import styles from "./QuickOrderModal.module.css";

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: AppProduct | null;
}

export function QuickOrderModal({
  isOpen,
  onClose,
  product,
}: QuickOrderModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedPhone = useMemo(
    () => phone.replace(/[^\d+]/g, "").trim(),
    [phone]
  );

  const extractErrorMessage = (error: unknown): string => {
    const fallback = "Не вдалося створити швидке замовлення";

    if (!error || typeof error !== "object") {
      return fallback;
    }

    const responseData = (
      error as {
        response?: {
          data?: unknown;
        };
      }
    ).response?.data;

    if (!responseData || typeof responseData !== "object") {
      return fallback;
    }

    const data = responseData as {
      message?: unknown;
      error?: unknown;
      errors?: unknown;
    };

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (Array.isArray(data.message)) {
      const firstString = data.message.find(
        (item) => typeof item === "string" && item.trim()
      );

      if (typeof firstString === "string") {
        return firstString;
      }
    }

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }

    if (Array.isArray(data.errors)) {
      const firstError = data.errors[0] as unknown;

      if (typeof firstError === "string" && firstError.trim()) {
        return firstError;
      }

      if (firstError && typeof firstError === "object") {
        const validationCandidate = firstError as {
          constraints?: Record<string, string>;
          children?: Array<{
            constraints?: Record<string, string>;
          }>;
        };

        const firstConstraint = validationCandidate.constraints
          ? Object.values(validationCandidate.constraints)[0]
          : undefined;

        if (typeof firstConstraint === "string" && firstConstraint.trim()) {
          return firstConstraint;
        }

        const nestedConstraint = validationCandidate.children?.[0]?.constraints
          ? Object.values(validationCandidate.children[0].constraints ?? {})[0]
          : undefined;

        if (typeof nestedConstraint === "string" && nestedConstraint.trim()) {
          return nestedConstraint;
        }
      }
    }

    return fallback;
  };

  if (!isOpen || !product) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!fullName.trim() || normalizedPhone.length < 10) {
      toast.error("Вкажіть коректні ім'я та номер телефону");
      return;
    }

    setIsSubmitting(true);

    try {
      await createQuickOrderCSR({
        productId: product.id,
        quantity: 1,
        fullName: fullName.trim(),
        phone: normalizedPhone,
        comment: comment.trim() || undefined,
      });

      toast.success("Швидке замовлення створено. Менеджер зв'яжеться з вами.");
      setFullName("");
      setPhone("");
      setComment("");
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error));
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
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(event) => event.stopPropagation()}
        >
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>

          <h3 className={styles.title}>Швидке замовлення</h3>
          <p className={styles.subtitle}>{product.name}</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Ім&rsquo;я
              <input
                className={styles.input}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ваше ім'я"
                required
              />
            </label>

            <label className={styles.label}>
              Телефон
              <input
                className={styles.input}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+380..."
                required
              />
            </label>

            <label className={styles.label}>
              Коментар (необов&rsquo;язково)
              <textarea
                className={styles.textarea}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Дзвоніть перед доставкою"
                rows={3}
              />
            </label>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Надсилаємо..." : "Підтвердити"}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
