import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Товари",
  description:
    "Керування товарами, цінами та залишками в адмін-панелі Будлідер.",
};

export default function AdminProductsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
