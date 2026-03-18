const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const PRODUCT_PLACEHOLDER_SRC = "/img/not-img.webp";

export const resolveMediaUrl = (value: string | undefined): string => {
  const normalized = (value ?? "").trim();

  if (!normalized) {
    return PRODUCT_PLACEHOLDER_SRC;
  }

  // Avoid requesting a known missing backend placeholder file.
  if (normalized.toLowerCase().includes("catalog-placeholder")) {
    return PRODUCT_PLACEHOLDER_SRC;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  // Keep local app assets local (do not rewrite to backend host).
  if (normalized.startsWith("/images/") || normalized.startsWith("/img/")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${API_BASE_URL}${normalized}`;
  }

  return normalized;
};
