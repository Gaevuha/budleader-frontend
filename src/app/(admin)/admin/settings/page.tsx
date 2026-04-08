"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Settings, Save } from "lucide-react";

import { Button } from "@/components/UI/Button/Button";
import { FormInput } from "@/components/UI/FormInput/FormInput";
import { apiFetch, getApiErrorMessage } from "@/services/api";
import {
  parseHelpQuickLinks,
  parseWorkSchedule,
  serializeHelpQuickLinks,
  serializeWorkSchedule,
} from "@/services/supportContent";
import { toast } from "@/components/UI/notifications/toast";
import styles from "./SettingsPage.module.css";

type AdminSettings = {
  storeName: string;
  contactPhone: string;
  notificationEmail: string;
  officeAddress: string;
  workSchedule: string[];
  helpQuickLinks: {
    id: string;
    label: string;
    href: string;
    description: string;
  }[];
};

let settingsRequest: Promise<AdminSettings> | null = null;
let settingsSnapshot: AdminSettings | null = null;

const DEFAULT_SETTINGS: AdminSettings = {
  storeName: "БудЛідер",
  contactPhone: "+380 (99) 123-45-67",
  notificationEmail: "info@budleader.com.ua",
  officeAddress: "м. Київ, вул. Будівельна, 15",
  workSchedule: [
    "Пн–Пт: 08:30–18:00",
    "Сб: 09:00–15:00",
    "Нд: прийом онлайн-заявок",
  ],
  helpQuickLinks: [
    {
      id: "help-center",
      label: "Центр допомоги",
      href: "/help",
      description: "Огляд каналів підтримки та сценаріїв звернення.",
    },
    {
      id: "delivery-payment",
      label: "Доставка і оплата",
      href: "/help?faq=оплата#faq",
      description: "Швидкий перехід до питань про логістику та реквізити.",
    },
    {
      id: "returns",
      label: "Повернення товару",
      href: "/help?faq=повернення#faq",
      description: "Повернення, обмін і подальші кроки по заявці.",
    },
  ],
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
  const [workScheduleInput, setWorkScheduleInput] = useState(
    serializeWorkSchedule(DEFAULT_SETTINGS.workSchedule)
  );
  const [helpQuickLinksInput, setHelpQuickLinksInput] = useState(
    serializeHelpQuickLinks(DEFAULT_SETTINGS.helpQuickLinks)
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const nextSettings = await fetchAdminSettings();

        setSettings(nextSettings);
        setWorkScheduleInput(serializeWorkSchedule(nextSettings.workSchedule));
        setHelpQuickLinksInput(
          serializeHelpQuickLinks(nextSettings.helpQuickLinks)
        );
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
        body: {
          ...settings,
          workSchedule: parseWorkSchedule(workScheduleInput),
          helpQuickLinks: parseHelpQuickLinks(helpQuickLinksInput),
        },
      });

      settingsSnapshot = payload;
      setSettings(payload);
      setWorkScheduleInput(serializeWorkSchedule(payload.workSchedule));
      setHelpQuickLinksInput(serializeHelpQuickLinks(payload.helpQuickLinks));
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

        <div className={styles.formGroup}>
          <label className={styles.label}>Робочий графік</label>
          <textarea
            value={workScheduleInput}
            onChange={(e) => setWorkScheduleInput(e.target.value)}
            className={styles.textarea}
          />
          <p className={styles.helperText}>Один рядок = один пункт графіка.</p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Швидкі посилання Help</label>
          <textarea
            value={helpQuickLinksInput}
            onChange={(e) => setHelpQuickLinksInput(e.target.value)}
            className={styles.textarea}
          />
          <p className={styles.helperText}>
            Формат рядка: Назва | href | короткий опис.
          </p>
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
