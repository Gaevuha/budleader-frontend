"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  FileText,
  Layers,
  MessageSquare,
  BarChart2,
} from "lucide-react";
import styles from "./AdminLayout.module.css";

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = usePathname();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Link href="/">
            Буд<span className={styles.primaryText}>Лідер</span> Адмін
          </Link>
        </div>
        <nav className={styles.nav}>
          <Link
            href="/admin"
            className={`${styles.navItem} ${
              location === "/admin" ||
              location === "/admin/dashboard"
                ? styles.active
                : ""
            }`}
          >
            <LayoutDashboard size={20} /> Дашборд
          </Link>
          <Link
            href="/admin/products"
            className={`${styles.navItem} ${
              location.includes("/admin/products") ? styles.active : ""
            }`}
          >
            <ShoppingBag size={20} /> Товари
          </Link>
          <Link
            href="/admin/categories"
            className={`${styles.navItem} ${
              location.includes("/admin/categories")
                ? styles.active
                : ""
            }`}
          >
            <Layers size={20} /> Категорії
          </Link>
          <Link
            href="/admin/orders"
            className={`${styles.navItem} ${
              location.includes("/admin/orders") ? styles.active : ""
            }`}
          >
            <FileText size={20} /> Замовлення
          </Link>
          <Link
            href="/admin/users"
            className={`${styles.navItem} ${
              location.includes("/admin/users") ? styles.active : ""
            }`}
          >
            <Users size={20} /> Користувачі
          </Link>
          <Link
            href="/admin/reviews"
            className={`${styles.navItem} ${
              location.includes("/admin/reviews") ? styles.active : ""
            }`}
          >
            <MessageSquare size={20} /> Відгуки
          </Link>
          <Link
            href="/admin/analytics"
            className={`${styles.navItem} ${
              location.includes("/admin/analytics")
                ? styles.active
                : ""
            }`}
          >
            <BarChart2 size={20} /> Аналітика
          </Link>
          <Link
            href="/admin/settings"
            className={`${styles.navItem} ${
              location.includes("/admin/settings") ? styles.active : ""
            }`}
          >
            <Settings size={20} /> Налаштування
          </Link>
        </nav>
        <div className={styles.logout}>
          <Link href="/" className={styles.navItem}>
            <LogOut size={20} /> Вийти
          </Link>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.header}>
          <h2>Панель керування</h2>
          <div className={styles.userProfile}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
              }}
            >
              А
            </div>
            <span>Адміністратор</span>
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
};
