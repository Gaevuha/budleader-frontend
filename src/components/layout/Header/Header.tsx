"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "../Container/Container";
import {
  ShoppingCart,
  User,
  Menu,
  Search,
  Heart,
  Grid,
  Moon,
  Sun,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CatalogDropdown } from "../../UI/CatalogDropdown/CatalogDropdown";
import { AuthModal } from "@/components/UI/AuthModal/AuthModal";
import type { Category } from "@/types/category";
import { useCartStore } from "@/store/cart/cartStore";
import { useUIStore } from "@/store/ui/uiStore";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";
import { useAuthStore } from "@/store/auth/authStore";
import styles from "./Header.module.css";

interface HeaderProps {
  categories: Category[];
}

export const Header = ({ categories }: HeaderProps) => {
  const currentUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const cart = useCartStore((state) => state.cart);
  const wishlist = useWishlistStore((state) => state.wishlist);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const handleLogout = () => {
    void logout();
  };

  const displayName =
    currentUser?.firstName ?? currentUser?.email ?? "Користувач";
  const cartCount = cart.reduce((acc: number, item) => acc + item.quantity, 0);

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
                title={
                  theme === "light"
                    ? "Увімкнути темну тему"
                    : "Увімкнути світлу тему"
                }
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            </div>

            <div className={styles.topBarCenter}>
              <span className={styles.phone}>068-68-68-400</span>
            </div>

            <div className={styles.topBarRight}>
              {currentUser ? (
                <div className={styles.topBarAuth} onClick={handleLogout}>
                  <User size={16} />
                  <span>ВИХІД ({displayName})</span>
                </div>
              ) : (
                <button
                  className={styles.topBarAuth}
                  onClick={() => setIsAuthOpen(true)}
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
        <div className={styles.wrapper}>
          <button className={styles.mobileMenuBtn}>
            <Menu size={24} />
          </button>

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
            <Search size={20} className={styles.searchIconLeft} />
            <input
              type="text"
              placeholder="Я шукаю..."
              className={styles.searchInput}
            />
          </div>

          <div className={styles.actions}>
            <Link href="/wishlist" className={styles.actionBtn}>
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
      </Container>

      <AnimatePresence>
        {isCatalogOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
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

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
};
