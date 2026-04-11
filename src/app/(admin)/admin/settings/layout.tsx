import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Налаштування",
  description: "Системні налаштування магазину в адмін-панелі Будлідер.",
};

export default function AdminSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
