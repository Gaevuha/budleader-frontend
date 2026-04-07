type NotificationType = "success" | "error" | "info" | "warning" | "loading";

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  duration: number | null;
}

export interface ToastOptions {
  id?: string;
  duration?: number;
}

type NotificationEvent =
  | { type: "upsert"; notification: NotificationRecord }
  | { type: "dismiss"; id?: string };

type NotificationListener = (event: NotificationEvent) => void;

const listeners = new Set<NotificationListener>();

function createNotification(
  type: NotificationType,
  title: string,
  options?: ToastOptions
): NotificationRecord {
  return {
    id:
      options?.id ??
      `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    duration:
      options?.duration ??
      (type === "loading" ? null : type === "error" ? 5200 : 3600),
  };
}

function publish(notification: NotificationRecord) {
  listeners.forEach((listener) => listener({ type: "upsert", notification }));
  return notification.id;
}

function dismiss(id?: string) {
  listeners.forEach((listener) => listener({ type: "dismiss", id }));
}

function notify(
  type: NotificationType,
  message: string,
  options?: ToastOptions
) {
  return publish(createNotification(type, message, options));
}

export const toast = {
  success(message: string, options?: ToastOptions) {
    return notify("success", message, options);
  },
  error(message: string, options?: ToastOptions) {
    return notify("error", message, options);
  },
  info(message: string, options?: ToastOptions) {
    return notify("info", message, options);
  },
  warning(message: string, options?: ToastOptions) {
    return notify("warning", message, options);
  },
  loading(message: string, options?: ToastOptions) {
    return notify("loading", message, options);
  },
  dismiss(id?: string) {
    dismiss(id);
  },
};

export function subscribeToNotifications(listener: NotificationListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
