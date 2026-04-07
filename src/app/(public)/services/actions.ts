"use server";

import { cookies } from "next/headers";

import type {
  ServiceRequestFormState,
  ServiceRequestPayload,
} from "./form-state";

const INITIAL_ERROR_MESSAGE = "Не вдалося відправити заявку. Спробуйте ще раз.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/i, "");
};

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
);

const getStringValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const toFormState = (
  status: ServiceRequestFormState["status"],
  message: string,
  fieldErrors: ServiceRequestFormState["fieldErrors"] = {}
): ServiceRequestFormState => ({
  status,
  message,
  fieldErrors,
});

const parseServiceRequestFormData = (
  formData: FormData
):
  | { success: true; payload: ServiceRequestPayload }
  | {
      success: false;
      state: ServiceRequestFormState;
    } => {
  const payload: ServiceRequestPayload = {
    customerName: getStringValue(formData, "customerName"),
    customerPhone: getStringValue(formData, "customerPhone"),
    customerEmail: getStringValue(formData, "customerEmail"),
    address: getStringValue(formData, "address"),
    comment: getStringValue(formData, "comment"),
    serviceId: getStringValue(formData, "serviceId"),
    serviceName: getStringValue(formData, "serviceName"),
    servicePricePerHour: Number(
      getStringValue(formData, "servicePricePerHour")
    ),
  };

  const fieldErrors: ServiceRequestFormState["fieldErrors"] = {};

  if (payload.customerName.length < 2) {
    fieldErrors.customerName = "Вкажіть ім'я щонайменше з 2 символів.";
  }

  if (!payload.customerPhone) {
    fieldErrors.customerPhone = "Вкажіть номер телефону.";
  }

  if (payload.customerEmail && !EMAIL_PATTERN.test(payload.customerEmail)) {
    fieldErrors.customerEmail = "Вкажіть коректний email.";
  }

  if (payload.address.length < 5) {
    fieldErrors.address = "Вкажіть адресу об'єкта.";
  }

  if (!payload.serviceId) {
    fieldErrors.serviceId = "Не вдалося визначити послугу.";
  }

  if (!payload.serviceName) {
    fieldErrors.serviceName = "Не вдалося передати назву послуги.";
  }

  if (
    !Number.isFinite(payload.servicePricePerHour) ||
    payload.servicePricePerHour <= 0
  ) {
    fieldErrors.servicePricePerHour = "Не вдалося передати вартість послуги.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      state: toFormState(
        "error",
        "Перевірте коректність заповнення форми.",
        fieldErrors
      ),
    };
  }

  return { success: true, payload };
};

const parseResponsePayload = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const extractMessage = (payload: unknown): string | null => {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    message?: unknown;
    error?: { message?: unknown };
  };

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message.trim();
  }

  if (
    candidate.error &&
    typeof candidate.error.message === "string" &&
    candidate.error.message.trim()
  ) {
    return candidate.error.message.trim();
  }

  return null;
};

export async function submitServiceRequest(
  _previousState: ServiceRequestFormState,
  formData: FormData
): Promise<ServiceRequestFormState> {
  const parsed = parseServiceRequestFormData(formData);

  if (!parsed.success) {
    return parsed.state;
  }

  const cookieStore = await cookies();
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  const cookieHeader = cookieStore.toString();
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/service-requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed.payload),
      cache: "no-store",
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      return toFormState(
        "error",
        extractMessage(payload) ?? INITIAL_ERROR_MESSAGE
      );
    }

    return toFormState(
      "success",
      extractMessage(payload) ??
        "Заявку успішно відправлено. Наш менеджер зв'яжеться з вами найближчим часом."
    );
  } catch {
    return toFormState("error", INITIAL_ERROR_MESSAGE);
  }
}
