import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Товари",
  description: "Перехід до каталогу товарів Будлідер.",
};

export default function ProductIndexLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
