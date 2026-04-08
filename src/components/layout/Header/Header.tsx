"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Container } from "../Container/Container";
import {
  ShoppingCart,
  User,
  Search,
  Heart,
  Grid,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CatalogDropdown } from "../../UI/CatalogDropdown/CatalogDropdown";
import { USER_QUERY_KEY, useLogout, useUser } from "@/queries/authQueries";
import type { Category } from "@/types/category";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import {
  applyThemeToDocument,
  persistThemeMode,
} from "@/services/themePreference";
import { useCartStore } from "@/store/cart/cartStore";
import { useAuthModalStore } from "@/store/ui/authModalStore";
import { useUIStore } from "@/store/ui/uiStore";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";
import { updateThemePreferenceCSR } from "@/services/themeClient";
import { publicSupportSettings } from "@/services/supportContent";
import { toast } from "@/components/UI/notifications/toast";
import type { ThemeMode } from "@/types/app";
import type { User as AppUser } from "@/types/auth";
import { BurgerButton } from "./BurgerButton";
import { MobileMenu } from "./MobileMenu";
import styles from "./Header.module.css";

interface HeaderProps {
  categories: Category[];
  initialTheme: ThemeMode;
}

export const Header = ({ categories, initialTheme }: HeaderProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isTablet, isDesktop } = useBreakpoint();
  const { data: currentUser } = useUser();
  const logoutMutation = useLogout();
  const openAuthModal = useAuthModalStore((state) => state.open);
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const cart = useCartStore((state) => state.cart);
  const wishlist = useWishlistStore((state) => state.wishlist);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchDirty, setIsSearchDirty] = useState(false);
  const [isThemeUpdating, setIsThemeUpdating] = useState(false);
  const compactSearchInputRef = useRef<HTMLInputElement | null>(null);
  const isCompactHeader = !isDesktop;
  const resolvedTheme = theme ?? initialTheme;

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const closeSearchPanel = () => {
    setIsSearchPanelOpen(false);
  };

  const handleThemeToggle = async () => {
    if (isThemeUpdating) {
      return;
    }

    const nextTheme: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    const previousTheme = resolvedTheme;

    setTheme(nextTheme);
    applyThemeToDocument(nextTheme);
    persistThemeMode(nextTheme);

    if (!currentUser) {
      return;
    }

    setIsThemeUpdating(true);

    try {
      const response = await updateThemePreferenceCSR(nextTheme);
      setTheme(response.theme);
      applyThemeToDocument(response.theme);
      persistThemeMode(response.theme);
      queryClient.setQueryData<AppUser | null>(USER_QUERY_KEY, {
        ...currentUser,
        theme: response.theme,
      });
    } catch {
      setTheme(previousTheme);
      applyThemeToDocument(previousTheme);
      persistThemeMode(previousTheme);
      toast.error("Не вдалося зберегти тему");
    } finally {
      setIsThemeUpdating(false);
    }
  };

  const handleLogout = async () => {
    closeMobileMenu();
    await logoutMutation.mutateAsync();
    router.push("/");
    router.refresh();
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      closeMobileMenu();
      closeSearchPanel();
      setIsCatalogOpen(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isCompactHeader) {
      const frameId = window.requestAnimationFrame(() => {
        setIsMobileMenuOpen(false);
        setIsSearchPanelOpen(false);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
  }, [isCompactHeader]);

  useEffect(() => {
    if (!isMobileMenuOpen && !isSearchPanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsSearchPanelOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen, isSearchPanelOpen]);

  useEffect(() => {
    if (!isSearchPanelOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      compactSearchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isSearchPanelOpen]);

  const handleWishlistNavigation = (
    event: React.MouseEvent<HTMLAnchorElement>
  ) => {
    event.preventDefault();
    router.push("/wishlist");
  };

  useEffect(() => {
    if (!isSearchDirty) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const normalized = searchQuery.trim();

      const nextTarget = normalized
        ? `/catalog?search=${encodeURIComponent(normalized)}`
        : "/catalog";

      if (isCompactHeader && normalized.length > 0) {
        setIsSearchPanelOpen(false);
      }

      router.replace(nextTarget);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCompactHeader, isSearchDirty, router, searchQuery]);

  const displayName =
    currentUser?.firstName ?? currentUser?.email ?? "Користувач";
  const profileHref =
    currentUser?.role === "admin" ? "/admin/dashboard" : "/profile";
  const cartCount = cart.reduce((acc: number, item) => acc + item.quantity, 0);
  const shouldShowTabletProfileAction = isTablet;
  const isWishlistPage = pathname === "/wishlist";
  const isCartPage = pathname === "/cart" || pathname.startsWith("/checkout");

  const handleProfileAction = () => {
    if (currentUser) {
      router.push(profileHref);
      return;
    }

    openAuthModal("login");
  };

  const handleSearchClear = () => {
    setIsSearchDirty(true);
    setSearchQuery("");
    router.replace("/catalog");

    if (isCompactHeader) {
      window.requestAnimationFrame(() => {
        compactSearchInputRef.current?.focus();
      });
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <Container>
          <div className={styles.topBarInner}>
            <div className={styles.topBarLinks}>
              <Link href="/catalog">Каталог</Link>
              <Link href="/services">Послуги</Link>
              <Link href="/help">Допомога</Link>
              <Link href="/news">Новини</Link>
              <Link href="/contacts">Контакти</Link>
              <button
                className={styles.themeToggle}
                onClick={handleThemeToggle}
                disabled={isThemeUpdating}
                title={
                  resolvedTheme === "light"
                    ? "Увімкнути темну тему"
                    : "Увімкнути світлу тему"
                }
              >
                {resolvedTheme === "light" ? (
                  <Moon size={16} />
                ) : (
                  <Sun size={16} />
                )}
              </button>
            </div>

            <div className={styles.topBarCenter}>
              <span className={styles.phone}>
                {publicSupportSettings.contactPhone}
              </span>
            </div>

            <div className={styles.topBarRight}>
              {currentUser ? (
                <>
                  <Link href={profileHref} className={styles.topBarAuth}>
                    <User size={16} />
                    <span>ПРОФІЛЬ ({displayName})</span>
                  </Link>
                  <button className={styles.topBarAuth} onClick={handleLogout}>
                    <User size={16} />
                    <span>ВИХІД</span>
                  </button>
                </>
              ) : (
                <button
                  className={styles.topBarAuth}
                  onClick={() => openAuthModal("login")}
                >
                  <User size={16} />
                  <span>ВХІД</span>
                </button>
              )}
              <Link href="/cart" className={styles.topBarCart}>
                <ShoppingCart size={16} />
                <span>ЗАМОВЛЕННЯ</span>
              </Link>
            </div>
          </div>
        </Container>
      </div>
      <Container>
        {isCompactHeader ? (
          <div className={styles.compactWrapper}>
            <BurgerButton
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            />

            <Link href="/" className={styles.logo}>
              Буд<span className={styles.primaryText}>Лідер</span>
            </Link>

            <div className={styles.compactActions}>
              <button
                type="button"
                className={styles.iconActionButton}
                onClick={() => setIsSearchPanelOpen(true)}
                aria-label="Відкрити пошук"
              >
                <Search className={styles.compactIcon} />
              </button>

              {shouldShowTabletProfileAction ? (
                <button
                  type="button"
                  className={styles.iconActionButton}
                  onClick={handleProfileAction}
                  aria-label={currentUser ? "Відкрити профіль" : "Увійти"}
                >
                  <User className={styles.compactIcon} />
                </button>
              ) : null}

              <Link
                href="/wishlist"
                className={`${styles.iconActionLink} ${
                  isWishlistPage ? styles.iconActionActive : ""
                }`}
                aria-label="Обране"
                aria-current={isWishlistPage ? "page" : undefined}
                onClick={handleWishlistNavigation}
              >
                <span className={styles.iconWrapper}>
                  <Heart className={styles.compactIcon} />
                  {wishlist.length > 0 ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={styles.badge}
                    >
                      {wishlist.length}
                    </motion.span>
                  ) : null}
                </span>
              </Link>

              <Link
                href="/cart"
                className={`${styles.iconActionLink} ${
                  isCartPage ? styles.iconActionActive : ""
                }`}
                aria-label="Кошик"
                aria-current={isCartPage ? "page" : undefined}
              >
                <span className={styles.iconWrapper}>
                  <ShoppingCart className={styles.compactIcon} />
                  {cartCount > 0 ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={styles.badge}
                    >
                      {cartCount}
                    </motion.span>
                  ) : null}
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.wrapper}>
            <Link href="/" className={styles.logo}>
              Буд<span className={styles.primaryText}>Лідер</span>
            </Link>

            <button
              className={`${styles.catalogBtn} ${
                isCatalogOpen ? styles.catalogBtnActive : ""
              }`}
              onClick={() => setIsCatalogOpen(!isCatalogOpen)}
            >
              <Grid size={20} />
              <span>КАТАЛОГ ТОВАРІВ</span>
            </button>

            <div className={styles.searchContainer}>
              <div className={styles.searchField}>
                <Search
                  size={20}
                  className={styles.searchIconLeft}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Я шукаю..."
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(event) => {
                    setIsSearchDirty(true);
                    setSearchQuery(event.target.value);
                  }}
                />
                {searchQuery.length > 0 ? (
                  <button
                    type="button"
                    className={styles.searchClearButton}
                    onClick={handleSearchClear}
                    aria-label="Очистити пошук"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className={styles.actions}>
              <Link
                href="/wishlist"
                className={styles.actionBtn}
                onClick={handleWishlistNavigation}
              >
                <div className={styles.iconWrapper}>
                  <Heart size={24} />
                  {wishlist.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={styles.badge}
                    >
                      {wishlist.length}
                    </motion.span>
                  )}
                </div>
                <span className={styles.actionText}>Обране</span>
              </Link>

              <Link href="/cart" className={styles.actionBtn}>
                <div className={styles.iconWrapper}>
                  <ShoppingCart size={24} />
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={styles.badge}
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </div>
                <span className={styles.actionText}>Кошик</span>
              </Link>
            </div>
          </div>
        )}
      </Container>

      <AnimatePresence>
        {isCompactHeader && isSearchPanelOpen ? (
          <>
            <motion.button
              type="button"
              className={styles.searchBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              aria-label="Закрити пошук"
              onClick={closeSearchPanel}
            />

            <motion.div
              className={styles.searchPanel}
              initial={{ opacity: 0, y: -18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <Container>
                <div className={styles.searchPanelInner}>
                  <div className={styles.searchField}>
                    <Search
                      size={20}
                      className={styles.searchIconLeft}
                      aria-hidden="true"
                    />
                    <input
                      ref={compactSearchInputRef}
                      type="text"
                      placeholder="Я шукаю..."
                      className={styles.searchInput}
                      value={searchQuery}
                      onChange={(event) => {
                        setIsSearchDirty(true);
                        setSearchQuery(event.target.value);
                      }}
                    />
                    {searchQuery.length > 0 ? (
                      <button
                        type="button"
                        className={styles.searchClearButton}
                        onClick={handleSearchClear}
                        aria-label="Очистити пошук"
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={styles.searchCloseButton}
                    onClick={closeSearchPanel}
                    aria-label="Закрити пошук"
                  >
                    Закрити
                  </button>
                </div>
              </Container>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isCatalogOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={styles.dropdownWrapper}
          >
            <Container className={styles.dropdownContainerWrapper}>
              <CatalogDropdown
                isOpen={isCatalogOpen}
                onClose={() => setIsCatalogOpen(false)}
                categories={categories}
              />
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCatalogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.backdrop}
            onClick={() => setIsCatalogOpen(false)}
          />
        )}
      </AnimatePresence>

      {isCompactHeader ? (
        <MobileMenu
          displayName={displayName}
          isAuthenticated={Boolean(currentUser)}
          isOpen={isMobileMenuOpen}
          profileHref={profileHref}
          theme={resolvedTheme}
          onClose={closeMobileMenu}
          onLogin={() => {
            closeMobileMenu();
            openAuthModal("login");
          }}
          onLogout={() => {
            void handleLogout();
          }}
          onThemeToggle={handleThemeToggle}
        />
      ) : null}
    </header>
  );
};
