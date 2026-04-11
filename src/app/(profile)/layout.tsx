import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getUser } from "@/services/apiServer";

export const metadata: Metadata = {
  title: {
    default: "Профіль",
    template: "%s | Профіль | Будлідер",
  },
  description: "Особистий кабінет користувача Будлідер.",
  robots: {
    index: false,
    follow: false,
  },
};

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
