const DEFAULT_RETURN_PATH = "/profile";
const ADMIN_RETURN_PATH = "/admin/dashboard";

const DISALLOWED_RETURN_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
]);

export const sanitizeAuthReturnPath = (
  value: string | null | undefined,
  fallback = DEFAULT_RETURN_PATH
): string => {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  const [pathname] = trimmed.split("?", 1);

  if (DISALLOWED_RETURN_PATHS.has(pathname)) {
    return fallback;
  }

  return trimmed;
};

export const resolvePostAuthRedirectPath = (
  role?: string,
  returnPath?: string | null,
  fallback = DEFAULT_RETURN_PATH
): string => {
  if (role === "admin") {
    return ADMIN_RETURN_PATH;
  }

  return sanitizeAuthReturnPath(returnPath, fallback);
};
