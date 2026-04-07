"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/layout/Header/Header";
import { Footer } from "@/components/layout/Footer/Footer";
import { AuthModal } from "@/components/UI/AuthModal/AuthModal";
import { NotificationCenter } from "@/components/UI/notifications/NotificationCenter";
import type { Category } from "@/types/category";
import styles from "@/app/layout.module.css";

interface AppChromeProps {
  children: ReactNode;
  categories: Category[];
}

export function AppChrome({ children, categories }: AppChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <div className={styles.layout}>
      <NotificationCenter variant={isAdminRoute ? "admin" : "public"} />
      <AuthModal />
      {!isAdminRoute ? <Header categories={categories} /> : null}
      <main className={styles.main}>{children}</main>
      {!isAdminRoute ? <Footer /> : null}
    </div>
  );
}
