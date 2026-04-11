import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Замовлення",
  description: "Керування замовленнями клієнтів в адмін-панелі Будлідер.",
};

export default function AdminOrdersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
