import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Оформлення замовлення",
    template: "%s | Замовлення | Будлідер",
  },
  description: "Кошик, оформлення та підтвердження замовлення в Будлідер.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children;
}
