import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Категорії",
  description:
    "Керування категоріями та структурою каталогу в адмін-панелі Будлідер.",
};

export default function AdminCategoriesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
