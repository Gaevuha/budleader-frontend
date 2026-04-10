import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getUser } from "@/services/apiServer";

interface ProfileLayoutProps {
  children: ReactNode;
}

export default async function ProfileLayout({ children }: ProfileLayoutProps) {
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}
