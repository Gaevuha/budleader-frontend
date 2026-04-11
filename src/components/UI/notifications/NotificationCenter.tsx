"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  subscribeToNotifications,
  type NotificationRecord,
} from "@/components/UI/notifications/toast";
import styles from "./NotificationCenter.module.css";

const MAX_VISIBLE_NOTIFICATIONS = 4;
const EXIT_ANIMATION_MS = 520;

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: TriangleAlert,
  loading: LoaderCircle,
};

type NotificationCenterProps = {
  variant?: "admin" | "public";
  placement?: "bottomEnd" | "bottomCenter";
};

type NotificationViewModel = NotificationRecord & {
  isExiting: boolean;
  revision: number;
};

export function NotificationCenter({
  variant = "public",
  placement = "bottomEnd",
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationViewModel[]>(
    []
  );
  const timersRef = useRef<Record<string, number>>({});
  const exitTimersRef = useRef<Record<string, number>>({});

  const clearTimers = useCallback((id: string) => {
    const timerId = timersRef.current[id];
    const exitTimerId = exitTimersRef.current[id];

    if (timerId) {
      window.clearTimeout(timerId);
      delete timersRef.current[id];
    }

    if (exitTimerId) {
      window.clearTimeout(exitTimerId);
      delete exitTimersRef.current[id];
    }
  }, []);

  const scheduleRemoval = useCallback(
    (id: string) => {
      clearTimers(id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isExiting: true } : item
        )
      );

      exitTimersRef.current[id] = window.setTimeout(() => {
        setNotifications((current) => current.filter((item) => item.id !== id));
        delete exitTimersRef.current[id];
      }, EXIT_ANIMATION_MS);
    },
    [clearTimers]
  );

  const scheduleAutoDismiss = useCallback(
    (notification: NotificationRecord) => {
      clearTimers(notification.id);

      if (notification.duration === null) {
        return;
      }

      timersRef.current[notification.id] = window.setTimeout(() => {
        scheduleRemoval(notification.id);
      }, notification.duration);
    },
    [clearTimers, scheduleRemoval]
  );

  useEffect(() => {
    return subscribeToNotifications((event) => {
      if (event.type === "dismiss") {
        if (event.id) {
          scheduleRemoval(event.id);
          return;
        }

        setNotifications((current) => {
          current.forEach((item) => {
            scheduleRemoval(item.id);
          });
          return current;
        });
        return;
      }

      const { notification } = event;

      setNotifications((current) => {
        const nextNotification = { ...notification, isExiting: false };
        const existingIndex = current.findIndex(
          (item) => item.id === notification.id
        );

        if (existingIndex >= 0) {
          const updated = [...current];
          updated[existingIndex] = {
            ...nextNotification,
            revision: updated[existingIndex].revision + 1,
          };
          return updated;
        }

        const next = [{ ...nextNotification, revision: 0 }, ...current];
        const overflow = next.slice(MAX_VISIBLE_NOTIFICATIONS);
        overflow.forEach((item) => clearTimers(item.id));
        return next.slice(0, MAX_VISIBLE_NOTIFICATIONS);
      });

      scheduleAutoDismiss(notification);
    });
  }, [scheduleAutoDismiss, scheduleRemoval, clearTimers]);

  useEffect(() => {
    const activeTimers = timersRef.current;
    const activeExitTimers = exitTimersRef.current;

    return () => {
      const ids = new Set([
        ...Object.keys(activeTimers),
        ...Object.keys(activeExitTimers),
      ]);

      ids.forEach((id) => {
        clearTimers(id);
      });
    };
  }, [clearTimers]);

  const dismissNotification = (id: string) => {
    scheduleRemoval(id);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className={`${styles.viewport} ${styles[variant]} ${styles[placement]}`}
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((notification, index) => {
        const Icon = ICONS[notification.type];
        const role = notification.type === "error" ? "alert" : "status";
        const hiddenCount = Math.max(
          notifications.length - MAX_VISIBLE_NOTIFICATIONS,
          0
        );

        return (
          <div
            key={`${notification.id}-${notification.revision}`}
            className={`${styles.card} ${styles[notification.type]} ${
              notification.isExiting ? styles.exiting : ""
            }`}
            role={role}
            style={
              {
                "--stack-offset": `${index * 7}px`,
                "--stack-scale": `${1 - index * 0.03}`,
                "--stack-opacity": `${Math.max(1 - index * 0.12, 0.45)}`,
              } as React.CSSProperties
            }
          >
            <div className={styles.iconWrap} aria-hidden="true">
              <Icon
                size={18}
                className={
                  notification.type === "loading" ? styles.spinner : undefined
                }
              />
            </div>

            <div className={styles.body}>
              <p className={styles.title}>{notification.title}</p>
              {index === MAX_VISIBLE_NOTIFICATIONS - 1 && hiddenCount > 0 ? (
                <p className={styles.stackHint}>
                  Ще {hiddenCount} сповіщень у стеку
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className={styles.closeButton}
              aria-label="Закрити сповіщення"
              onClick={() => dismissNotification(notification.id)}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
