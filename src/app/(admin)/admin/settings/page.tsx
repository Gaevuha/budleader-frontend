"use client";

import { Settings, Save } from "lucide-react";
import { Button } from "@/components/UI/Button/Button";
import { FormInput } from "@/components/UI/FormInput/FormInput";
import { toast } from "sonner";
import styles from "./SettingsPage.module.css";

export const SettingsPage = () => {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Налаштування успішно збережено!");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Settings size={24} color="var(--primary)" />
        <h2 className={styles.title}>Налаштування магазину</h2>
      </div>

      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.formRow}>
          <FormInput label="Назва магазину" defaultValue="БудЛідер" required />
          <FormInput
            label="Контактний телефон"
            defaultValue="+380 (99) 123-45-67"
            required
          />
        </div>

        <FormInput
          label="Email для сповіщень"
          type="email"
          defaultValue="info@budleader.com.ua"
          required
        />

        <div className={styles.formGroup}>
          <label className={styles.label}>Адреса головного офісу</label>
          <textarea
            defaultValue="м. Київ, вул. Будівельна, 15"
            className={styles.textarea}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit">
            <Save size={18} style={{ marginRight: 8 }} /> Зберегти зміни
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
