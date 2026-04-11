import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Послуги",
  description:
    "Послуги крана, маніту, екскаватора та вантажівки від Будлідер з можливістю залишити заявку онлайн.",
};

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return children;
}
