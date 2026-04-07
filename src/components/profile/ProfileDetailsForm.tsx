"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/UI/notifications/toast";

import { Button } from "@/components/UI/Button/Button";
import { Input } from "@/components/UI/Input/Input";
import { useUpdateProfile } from "@/queries/authQueries";
import { getApiErrorMessage } from "@/services/api";
import { resolveMediaUrl } from "@/utils/media";
import type { User } from "@/types/auth";

import { AvatarUploader } from "./AvatarUploader";
import { ProfileSection } from "./ProfileSection";
import styles from "./Profile.module.css";

interface ProfileDetailsFormProps {
  user: User;
}

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProfileDetailsForm({ user }: ProfileDetailsFormProps) {
  const updateProfileMutation = useUpdateProfile();
  const [name, setName] = useState(user.name ?? user.firstName ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current);
      }
    };
  }, []);

  const currentAvatarUrl = useMemo(() => {
    return user.avatar ? resolveMediaUrl(user.avatar) : undefined;
  }, [user.avatar]);

  const isDirty =
    name.trim() !== (user.name ?? user.firstName ?? "") ||
    phone.trim() !== (user.phone ?? "") ||
    Boolean(avatarFile);

  const handleReset = () => {
    setName(user.name ?? user.firstName ?? "");
    setPhone(user.phone ?? "");
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current);
      avatarPreviewRef.current = null;
    }
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
  };

  const handleAvatarFileChange = (file: File | null) => {
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current);
      avatarPreviewRef.current = null;
    }

    if (file && !ALLOWED_AVATAR_TYPES.has(file.type)) {
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      toast.error("Дозволені лише файли JPG, JPEG, PNG або WebP");
      return;
    }

    setAvatarFile(file);

    if (!file) {
      setAvatarPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    avatarPreviewRef.current = nextPreviewUrl;
    setAvatarPreviewUrl(nextPreviewUrl);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const updatedUser = await updateProfileMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        avatarFile,
      });

      setName(updatedUser.name ?? updatedUser.firstName ?? "");
      setPhone(updatedUser.phone ?? "");
      handleAvatarFileChange(null);
      toast.success("Профіль оновлено");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Не вдалося оновити профіль"));
    }
  };

  return (
    <ProfileSection
      title="Особисті дані"
      description="Редагуйте контактну інформацію, яку бачать менеджери замовлень."
      aside={<span className={styles.statusBadge}>Аккаунт активний</span>}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <AvatarUploader
          currentAvatarUrl={currentAvatarUrl}
          previewUrl={avatarPreviewUrl}
          displayName={name || user.email}
          isDisabled={updateProfileMutation.isPending}
          onFileChange={handleAvatarFileChange}
          onRemoveSelection={() => handleAvatarFileChange(null)}
        />

        <div className={styles.fields}>
          <div className={styles.fieldFull}>
            <Input
              label="Ім'я"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ваше ім'я"
              required
              disabled={updateProfileMutation.isPending}
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={user.email ?? ""}
            placeholder="name@example.com"
            required
            disabled
          />
          <Input
            label="Телефон"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+380..."
            disabled={updateProfileMutation.isPending}
          />
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            disabled={!isDirty || updateProfileMutation.isPending}
          >
            Скасувати
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? "Зберігаємо..." : "Зберегти"}
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
