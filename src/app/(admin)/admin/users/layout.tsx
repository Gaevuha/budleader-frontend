import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Користувачі",
  description:
    "Список користувачів та керування акаунтами в адмін-панелі Будлідер.",
};

export default function AdminUsersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
