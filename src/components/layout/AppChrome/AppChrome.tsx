"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/layout/Header/Header";
import { Footer } from "@/components/layout/Footer/Footer";
import { ModalRoot } from "@/components/UI/ModalRoot";
import { NotificationCenter } from "@/components/UI/notifications/NotificationCenter";
import { useAuthModalStore } from "@/store/ui/authModalStore";
import type { ThemeMode } from "@/types/app";
import type { Category } from "@/types/category";
import styles from "@/app/layout.module.css";

const AuthModal = dynamic(
  () =>
    import("@/components/UI/AuthModal/AuthModal").then(
      (module) => module.AuthModal
    ),
  { ssr: false }
);

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
  const isAuthModalOpen = useAuthModalStore((state) => state.isOpen);
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <>
      <NotificationCenter
        variant={isAdminRoute ? "admin" : "public"}
        placement="bottomCenter"
      />
      <ModalRoot />
      {isAuthModalOpen ? <AuthModal /> : null}
      {!isAdminRoute ? (
        <Header categories={categories} initialTheme={initialTheme} />
      ) : null}
      <main className={styles.main}>{children}</main>
      {!isAdminRoute ? <Footer /> : null}
    </>
  );
}
