"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/UI/Button/Button";
import { Input } from "@/components/UI/Input/Input";
import { useChangePassword } from "@/queries/authQueries";
import { getApiErrorMessage } from "@/services/api";

import { ProfileSection } from "./ProfileSection";
import styles from "./Profile.module.css";

export function PasswordChangeForm() {
  const changePasswordMutation = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const hasValues = Boolean(
    currentPassword.trim() || newPassword.trim() || confirmPassword.trim()
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Паролі не співпадають");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Пароль успішно змінено");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Не вдалося змінити пароль"));
    }
  };

  return (
    <ProfileSection
      title="Безпека"
      description="Оновіть пароль для захисту акаунта. Після зміни використовуйте новий пароль у всіх сесіях."
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Поточний пароль"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={changePasswordMutation.isPending}
        />
        <Input
          label="Новий пароль"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
          disabled={changePasswordMutation.isPending}
        />
        <Input
          label="Підтвердження нового пароля"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
          disabled={changePasswordMutation.isPending}
        />

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="danger"
            disabled={!hasValues || changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending
              ? "Оновлюємо..."
              : "Змінити пароль"}
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
