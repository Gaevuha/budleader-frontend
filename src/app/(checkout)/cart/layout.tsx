import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Кошик",
  description:
    "Перегляд товарів у кошику перед оформленням замовлення в Будлідер.",
};

export default function CartLayout({ children }: { children: ReactNode }) {
  return children;
}
