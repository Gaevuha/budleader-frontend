import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Обране",
  description: "Список обраних товарів у каталозі Будлідер.",
};

export default function WishlistLayout({ children }: { children: ReactNode }) {
  return children;
}
