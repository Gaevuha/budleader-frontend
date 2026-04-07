import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminLayout as AdminShell } from "@/components/admin/AdminLayout/AdminLayout";
import { getUser } from "@/services/apiServer";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/profile");
  }

  return <AdminShell>{children}</AdminShell>;
}
