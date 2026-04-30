"use client";

import Image from "next/image";
import { useId } from "react";

import styles from "./Profile.module.css";

interface AvatarUploaderProps {
  currentAvatarUrl?: string;
  previewUrl?: string | null;
  displayName: string;
  isDisabled?: boolean;
  onFileChange: (file: File | null) => void;
  onRemoveSelection: () => void;
}

const getInitials = (value: string): string => {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

export function AvatarUploader({
  currentAvatarUrl,
  previewUrl,
  displayName,
  isDisabled = false,
  onFileChange,
  onRemoveSelection,
}: AvatarUploaderProps) {
  const inputId = useId();
  const avatarSrc = previewUrl ?? currentAvatarUrl ?? null;

  return (
    <div className={styles.avatarBlock}>
      <div className={styles.avatarPreview} aria-hidden="true">
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt=""
            width={88}
            height={88}
            className={styles.avatarImage}
            unoptimized
          />
        ) : (
          <span>{getInitials(displayName)}</span>
        )}
      </div>

      <div className={styles.avatarInfo}>
        <p className={styles.avatarTitle}>Фото профілю</p>
        <p className={styles.avatarHint}>
          Підтримується попередній перегляд перед збереженням. Доступні формати:
          JPG, JPEG, PNG, WebP.
        </p>

        <div className={styles.avatarActions}>
          <input
            id={inputId}
            className={styles.fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            disabled={isDisabled}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              onFileChange(file);
              event.currentTarget.value = "";
            }}
          />

          <label
            htmlFor={inputId}
            className={`${styles.fileButton} ${
              isDisabled ? styles.fileButtonDisabled : ""
            }`}
          >
            Обрати файл
          </label>

          {previewUrl ? (
            <button
              type="button"
              className={styles.ghostButton}
              onClick={onRemoveSelection}
              disabled={isDisabled}
            >
              Скасувати вибір
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
