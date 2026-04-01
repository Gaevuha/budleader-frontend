import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AdminLayout as AdminShell } from "@/components/admin/AdminLayout/AdminLayout";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  if (role !== "admin") {
    redirect("/profile");
  }

  return <AdminShell>{children}</AdminShell>;
}
