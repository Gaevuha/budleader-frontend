"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, User, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import {
  helpQuickLinks,
  normalizePhoneHref,
  publicSupportSettings,
} from "@/services/supportContent";

import styles from "./MobileMenu.module.css";

interface MobileMenuLink {
  href: string;
  label: string;
}

interface MobileMenuProps {
  displayName: string;
  isAuthenticated: boolean;
  isOpen: boolean;
  profileHref: string;
  theme: "light" | "dark";
  onClose: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onThemeToggle: () => void;
}

const primaryLinks: MobileMenuLink[] = [
  { href: "/catalog", label: "Каталог" },
  { href: "/about", label: "Про нас" },
  { href: "/services", label: "Послуги" },
  { href: "/help", label: "Допомога" },
  { href: "/news", label: "Новини" },
  { href: "/contacts", label: "Контакти" },
];

export function MobileMenu({
  displayName,
  isAuthenticated,
  isOpen,
  profileHref,
  theme,
  onClose,
  onLogin,
  onLogout,
  onThemeToggle,
}: MobileMenuProps) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const phoneHref = normalizePhoneHref(publicSupportSettings.contactPhone);

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousActiveElement = document.activeElement;
    const getFocusableElements = () => {
      if (!drawerRef.current) {
        return [] as HTMLElement[];
      }

      return Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => {
        return (
          !element.hasAttribute("disabled") &&
          !element.getAttribute("aria-hidden")
        );
      });
    };

    const focusFirstElement = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFirstElement);
      document.removeEventListener("keydown", handleKeyDown);

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            type="button"
            className={styles.overlay}
            data-theme={theme}
            aria-label="Закрити меню"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={onClose}
          />

          <motion.aside
            id="mobile-menu"
            ref={drawerRef}
            className={styles.drawer}
            data-theme={theme}
            role="dialog"
            aria-modal="true"
            aria-label="Мобільне меню"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className={styles.header}>
              <Link href="/" className={styles.brandLink} onClick={onClose}>
                <span className={styles.brandText}>Буд</span>
                <span className={styles.brandAccent}>Лідер</span>
              </Link>
              <button
                type="button"
                ref={closeButtonRef}
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Закрити меню"
              >
                <X size={20} />
              </button>
            </div>

            <nav className={styles.section} aria-label="Мобільна навігація">
              <ul className={styles.linkList}>
                {primaryLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`${styles.link} ${
                        isLinkActive(link.href) ? styles.linkActive : ""
                      }`}
                      aria-current={
                        isLinkActive(link.href) ? "page" : undefined
                      }
                      onClick={onClose}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Швидко по Help</p>
              <div className={styles.quickLinkGrid}>
                {helpQuickLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={styles.quickAction}
                    onClick={onClose}
                  >
                    <span>{link.label}</span>
                    <span className={styles.quickActionText}>
                      {link.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <button
                type="button"
                className={styles.themeButton}
                onClick={onThemeToggle}
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                <span>{theme === "light" ? "Темна тема" : "Світла тема"}</span>
              </button>
            </div>

            <div className={styles.section}>
              {isAuthenticated ? (
                <>
                  <Link
                    href={profileHref}
                    className={`${styles.profileCard} ${
                      isLinkActive(profileHref) ? styles.quickActionActive : ""
                    }`}
                    aria-current={
                      isLinkActive(profileHref) ? "page" : undefined
                    }
                    onClick={onClose}
                  >
                    <User size={18} />
                    <div>
                      <p className={styles.profileLabel}>Профіль</p>
                      <p className={styles.profileValue}>{displayName}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={onLogout}
                  >
                    Вийти
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={onLogin}
                >
                  Увійти
                </button>
              )}
            </div>

            <div className={styles.footer}>
              <a
                href={phoneHref}
                className={styles.contactLink}
                onClick={onClose}
              >
                {publicSupportSettings.contactPhone}
              </a>
              <p className={styles.footerText}>
                Працюємо щодня для ваших замовлень
              </p>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
