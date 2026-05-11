"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { useDebounce } from "@/hooks/useDebounce";
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
import { updateThemePreferenceCSR } from "@/services/api";
import { toast } from "@/components/UI/notifications/toast";
import type { ThemeMode } from "@/types/app";
import type { User as AppUser } from "@/types/auth";
import { PRODUCT_PLACEHOLDER_SRC, resolveMediaUrl } from "@/utils/media";
import { BurgerButton } from "./BurgerButton";
import styles from "./Header.module.css";

const MobileMenu = dynamic(
  () => import("./MobileMenu").then((module) => module.MobileMenu),
  { ssr: false }
);

const CatalogDropdown = dynamic(
  () =>
    import("../../UI/CatalogDropdown/CatalogDropdown").then(
      (module) => module.CatalogDropdown
    ),
  { ssr: false }
);

interface HeaderClientProps {
  categories: Category[];
  initialTheme: ThemeMode;
  topBarLinksSlot: ReactNode;
  topBarCenterSlot: ReactNode;
  compactLogoSlot: ReactNode;
  desktopLogoSlot: ReactNode;
}

const TOPBAR_ICON_SLOT_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  flex: "0 0 16px",
} as const;

const COMPACT_ICON_SLOT_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  flex: "0 0 20px",
} as const;

const ICON_ACTION_SLOT_STYLE = {
  minWidth: 44,
  minHeight: 44,
} as const;

export const HeaderClient = ({
  categories,
  initialTheme,
  topBarLinksSlot,
  topBarCenterSlot,
  compactLogoSlot,
  desktopLogoSlot,
}: HeaderClientProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [hasProfileAvatarError, setHasProfileAvatarError] = useState(false);
  const compactSearchInputRef = useRef<HTMLInputElement | null>(null);
  const isCompactHeader = !isDesktop;
  const resolvedTheme = theme ?? initialTheme;
  const debouncedSearchQuery = useDebounce(searchQuery, 600);
  const normalizedProfileAvatarSrc = currentUser?.avatar
    ? resolveMediaUrl(currentUser.avatar)
    : null;
  const profileAvatarSrc =
    normalizedProfileAvatarSrc &&
    normalizedProfileAvatarSrc !== PRODUCT_PLACEHOLDER_SRC
      ? normalizedProfileAvatarSrc
      : null;

  useEffect(() => {
    setHasProfileAvatarError(false);
  }, [profileAvatarSrc]);

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
    if (!pathname.startsWith("/catalog")) {
      return;
    }

    const searchFromUrl = (searchParams.get("search") ?? "").trim();

    if (searchFromUrl === searchQuery) {
      return;
    }

    setSearchQuery(searchFromUrl);
    setIsSearchDirty(false);
  }, [pathname, searchParams, searchQuery]);

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

    const normalized = debouncedSearchQuery.trim();
    const nextTarget = normalized
      ? `/catalog?search=${encodeURIComponent(normalized)}`
      : "/catalog";

    if (isCompactHeader && normalized.length > 0) {
      setIsSearchPanelOpen(false);
    }

    router.replace(nextTarget);
  }, [debouncedSearchQuery, isCompactHeader, isSearchDirty, router]);

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
    setIsSearchDirty(false);
    setSearchQuery("");
    router.replace("/catalog");

    if (isCompactHeader) {
      window.requestAnimationFrame(() => {
        compactSearchInputRef.current?.focus();
      });
    }
  };

  const renderProfileTriggerIcon = (variant: "topBar" | "compact") => {
    const slotStyle =
      variant === "topBar" ? TOPBAR_ICON_SLOT_STYLE : COMPACT_ICON_SLOT_STYLE;

    if (!profileAvatarSrc || hasProfileAvatarError) {
      return (
        <span style={slotStyle} aria-hidden="true">
          {variant === "topBar" ? (
            <User size={16} />
          ) : (
            <User className={styles.compactIcon} />
          )}
        </span>
      );
    }

    return (
      <span style={slotStyle} aria-hidden="true">
        <Image
          src={profileAvatarSrc}
          alt=""
          aria-hidden="true"
          width={variant === "topBar" ? 16 : 20}
          height={variant === "topBar" ? 16 : 20}
          className={
            variant === "topBar"
              ? styles.topBarProfileAvatar
              : styles.compactProfileAvatar
          }
          unoptimized
          onError={() => setHasProfileAvatarError(true)}
        />
      </span>
    );
  };

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <Container>
          <div className={styles.topBarInner}>
            <div className={styles.topBarLinks}>
              {topBarLinksSlot}
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

            <div className={styles.topBarCenter}>{topBarCenterSlot}</div>

            <div className={styles.topBarRight}>
              {currentUser ? (
                <>
                  <Link href={profileHref} className={styles.topBarAuth}>
                    {renderProfileTriggerIcon("topBar")}
                    <span>ПРОФІЛЬ ({displayName})</span>
                  </Link>
                  <button className={styles.topBarAuth} onClick={handleLogout}>
                    <span style={TOPBAR_ICON_SLOT_STYLE} aria-hidden="true">
                      <User size={16} />
                    </span>
                    <span>ВИХІД</span>
                  </button>
                </>
              ) : (
                <button
                  className={styles.topBarAuth}
                  onClick={() => openAuthModal("login")}
                >
                  <span style={TOPBAR_ICON_SLOT_STYLE} aria-hidden="true">
                    <User size={16} />
                  </span>
                  <span>ВХІД</span>
                </button>
              )}
              <Link href="/cart" className={styles.topBarCart}>
                <span style={TOPBAR_ICON_SLOT_STYLE} aria-hidden="true">
                  <ShoppingCart size={16} />
                </span>
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

            {compactLogoSlot}

            <div className={styles.compactActions}>
              <button
                type="button"
                className={styles.iconActionButton}
                style={ICON_ACTION_SLOT_STYLE}
                onClick={() => setIsSearchPanelOpen(true)}
                aria-label="Відкрити пошук"
              >
                <Search className={styles.compactIcon} />
              </button>

              <Link
                href="/wishlist"
                className={`${styles.iconActionLink} ${
                  isWishlistPage ? styles.iconActionActive : ""
                }`}
                style={ICON_ACTION_SLOT_STYLE}
                aria-label="Обране"
                aria-current={isWishlistPage ? "page" : undefined}
                onClick={handleWishlistNavigation}
              >
                <span className={styles.iconWrapper}>
                  <Heart className={styles.compactIcon} />
                  <span
                    className={styles.badge}
                    style={{
                      visibility: wishlist.length > 0 ? "visible" : "hidden",
                    }}
                  >
                    {wishlist.length > 0 ? wishlist.length : 0}
                  </span>
                </span>
              </Link>

              <Link
                href="/cart"
                className={`${styles.iconActionLink} ${
                  isCartPage ? styles.iconActionActive : ""
                }`}
                style={ICON_ACTION_SLOT_STYLE}
                aria-label="Кошик"
                aria-current={isCartPage ? "page" : undefined}
              >
                <span className={styles.iconWrapper}>
                  <ShoppingCart className={styles.compactIcon} />
                  <span
                    className={styles.badge}
                    style={{ visibility: cartCount > 0 ? "visible" : "hidden" }}
                  >
                    {cartCount > 0 ? cartCount : 0}
                  </span>
                </span>
              </Link>

              {shouldShowTabletProfileAction ? (
                <button
                  type="button"
                  className={styles.iconActionButton}
                  style={ICON_ACTION_SLOT_STYLE}
                  onClick={handleProfileAction}
                  aria-label={currentUser ? "Відкрити профіль" : "Увійти"}
                >
                  {renderProfileTriggerIcon("compact")}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.wrapper}>
            {desktopLogoSlot}

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
                  <span
                    className={styles.badge}
                    style={{
                      visibility: wishlist.length > 0 ? "visible" : "hidden",
                    }}
                  >
                    {wishlist.length > 0 ? wishlist.length : 0}
                  </span>
                </div>
                <span className={styles.actionText}>Обране</span>
              </Link>

              <Link href="/cart" className={styles.actionBtn}>
                <div className={styles.iconWrapper}>
                  <ShoppingCart size={24} />
                  <span
                    className={styles.badge}
                    style={{ visibility: cartCount > 0 ? "visible" : "hidden" }}
                  >
                    {cartCount > 0 ? cartCount : 0}
                  </span>
                </div>
                <span className={styles.actionText}>Кошик</span>
              </Link>
            </div>
          </div>
        )}
      </Container>

      {isCompactHeader && isSearchPanelOpen ? (
        <>
          <button
            type="button"
            className={styles.searchBackdrop}
            aria-label="Закрити пошук"
            onClick={closeSearchPanel}
          />

          <div className={styles.searchPanel}>
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
          </div>
        </>
      ) : null}

      {isCatalogOpen ? (
        <div className={styles.dropdownWrapper}>
          <Container className={styles.dropdownContainerWrapper}>
            <CatalogDropdown
              isOpen={isCatalogOpen}
              onClose={() => setIsCatalogOpen(false)}
              categories={categories}
            />
          </Container>
        </div>
      ) : null}

      {isCatalogOpen ? (
        <div
          className={styles.backdrop}
          onClick={() => setIsCatalogOpen(false)}
        />
      ) : null}

      {isCompactHeader && isMobileMenuOpen ? (
        <MobileMenu
          avatarSrc={profileAvatarSrc}
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
