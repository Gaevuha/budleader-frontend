import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Аналітика",
  description: "Аналітика продажів і активності користувачів у Будлідер.",
};

export default function AdminAnalyticsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
