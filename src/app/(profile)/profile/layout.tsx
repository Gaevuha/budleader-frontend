import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Мій профіль",
  description:
    "Персональні дані, налаштування акаунта та керування профілем у Будлідер.",
};

export default function ProfilePageLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
