import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Акаунт",
    template: "%s | Акаунт | Будлідер",
  },
  description:
    "Сторінки входу, реєстрації та відновлення доступу до акаунта Будлідер.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
