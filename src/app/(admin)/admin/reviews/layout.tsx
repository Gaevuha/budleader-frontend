import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Відгуки",
  description: "Модерація відгуків і оцінок товарів у адмін-панелі Будлідер.",
};

export default function AdminReviewsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
