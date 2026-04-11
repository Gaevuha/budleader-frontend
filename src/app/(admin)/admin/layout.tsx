import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminLayout as AdminShell } from "@/components/admin/AdminLayout/AdminLayout";
import { getUser } from "@/services/apiServer";

export const metadata: Metadata = {
  title: {
    default: "Адмін-панель",
    template: "%s | Адмін | Будлідер",
  },
  description: "Адміністративний розділ керування магазином Будлідер.",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  if (user.role !== "admin") {
    redirect("/profile");
  }

  return <AdminShell>{children}</AdminShell>;
}
