import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Оформлення",
  description: "Форма оформлення замовлення в Будлідер.",
};

export default function CheckoutPageLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
