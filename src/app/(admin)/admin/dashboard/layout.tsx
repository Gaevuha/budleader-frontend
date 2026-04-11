import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Дашборд",
  description: "Огляд ключових показників магазину в адмін-панелі Будлідер.",
};

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
