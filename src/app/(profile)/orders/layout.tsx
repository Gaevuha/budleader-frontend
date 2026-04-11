import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Мої замовлення",
  description: "Історія замовлень, статуси та деталі покупок у Будлідер.",
};

export default function ProfileOrdersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
