"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/layout/Header/Header";
import { Footer } from "@/components/layout/Footer/Footer";
import { AuthModal } from "@/components/UI/AuthModal/AuthModal";
import { NotificationCenter } from "@/components/UI/notifications/NotificationCenter";
import type { ThemeMode } from "@/types/app";
import type { Category } from "@/types/category";
import styles from "@/app/layout.module.css";

interface AppChromeProps {
  children: ReactNode;
  categories: Category[];
  initialTheme: ThemeMode;
}

export function AppChrome({
  children,
  categories,
  initialTheme,
}: AppChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <>
      <NotificationCenter
        variant={isAdminRoute ? "admin" : "public"}
        placement="bottomCenter"
      />
      <AuthModal />
      {!isAdminRoute ? (
        <Header categories={categories} initialTheme={initialTheme} />
      ) : null}
      <main className={styles.main}>{children}</main>
      {!isAdminRoute ? <Footer /> : null}
    </>
  );
}
