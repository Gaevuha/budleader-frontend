import Link from "next/link";

import { publicSupportSettings } from "@/services/supportContent";
import type { ThemeMode } from "@/types/app";
import type { Category } from "@/types/category";

import { HeaderClient } from "./HeaderClient";
import styles from "./Header.module.css";

interface HeaderServerProps {
  categories: Category[];
  initialTheme: ThemeMode;
}

export function HeaderServer({ categories, initialTheme }: HeaderServerProps) {
  return (
    <HeaderClient
      categories={categories}
      initialTheme={initialTheme}
      topBarLinksSlot={
        <>
          <Link href="/catalog" prefetch={false}>
            Каталог
          </Link>
          <Link href="/services">Послуги</Link>
          <Link href="/help">Допомога</Link>
          <Link href="/news">Новини</Link>
          <Link href="/contacts">Контакти</Link>
        </>
      }
      topBarCenterSlot={
        <span className={styles.phone}>
          {publicSupportSettings.contactPhone}
        </span>
      }
      compactLogoSlot={
        <Link href="/" className={styles.logo}>
          Буд<span className={styles.primaryText}>Лідер</span>
        </Link>
      }
      desktopLogoSlot={
        <Link href="/" className={styles.logo}>
          Буд<span className={styles.primaryText}>Лідер</span>
        </Link>
      }
    />
  );
}
