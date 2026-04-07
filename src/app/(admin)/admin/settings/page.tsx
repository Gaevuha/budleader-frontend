"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Settings, Save } from "lucide-react";

import { Button } from "@/components/UI/Button/Button";
import { FormInput } from "@/components/UI/FormInput/FormInput";
import { apiFetch, getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import styles from "./SettingsPage.module.css";

type AdminSettings = {
  storeName: string;
  contactPhone: string;
  notificationEmail: string;
  officeAddress: string;
};

let settingsRequest: Promise<AdminSettings> | null = null;
let settingsSnapshot: AdminSettings | null = null;

const DEFAULT_SETTINGS: AdminSettings = {
  storeName: "БудЛідер",
  contactPhone: "+380 (99) 123-45-67",
  notificationEmail: "info@budleader.com.ua",
  officeAddress: "м. Київ, вул. Будівельна, 15",
};

const fetchAdminSettings = async (): Promise<AdminSettings> => {
  if (settingsSnapshot) {
    return settingsSnapshot;
  }

  if (!settingsRequest) {
    settingsRequest = apiFetch<AdminSettings>("/api/admin/settings", {
      retryOn401: false,
    })
      .then((payload) => {
        settingsSnapshot = { ...DEFAULT_SETTINGS, ...payload };
        return settingsSnapshot;
      })
      .finally(() => {
        settingsRequest = null;
      });
  }

  return settingsRequest;
};

export const SettingsPage = () => {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettings(await fetchAdminSettings());
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, "Не вдалося завантажити налаштування")
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    setIsSaving(true);

    try {
      const payload = await apiFetch<AdminSettings>("/api/admin/settings", {
        method: "PUT",
        body: settings,
      });

      settingsSnapshot = payload;
      setSettings(payload);
      toast.success("Налаштування успішно збережено");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Не вдалося зберегти налаштування")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Settings size={24} color="var(--primary)" />
        <h2 className={styles.title}>Налаштування магазину</h2>
      </div>

      <form onSubmit={handleSave} className={styles.form}>
        {isLoading ? (
          <p className={styles.statusText}>Завантаження налаштувань...</p>
        ) : null}
        <div className={styles.formRow}>
          <FormInput
            label="Назва магазину"
            value={settings.storeName}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, storeName: e.target.value }))
            }
            required
          />
          <FormInput
            label="Контактний телефон"
            value={settings.contactPhone}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, contactPhone: e.target.value }))
            }
            required
          />
        </div>

        <FormInput
          label="Email для сповіщень"
          type="email"
          value={settings.notificationEmail}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              notificationEmail: e.target.value,
            }))
          }
          required
        />

        <div className={styles.formGroup}>
          <label className={styles.label}>Адреса головного офісу</label>
          <textarea
            value={settings.officeAddress}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                officeAddress: e.target.value,
              }))
            }
            className={styles.textarea}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={isSaving || isLoading}>
            <Save size={18} style={{ marginRight: 8 }} /> Зберегти зміни
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
