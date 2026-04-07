"use client";

import { Menu, X } from "lucide-react";

import styles from "./BurgerButton.module.css";

interface BurgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function BurgerButton({ isOpen, onClick }: BurgerButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      aria-label={isOpen ? "Закрити меню" : "Відкрити меню"}
      aria-expanded={isOpen}
      aria-controls="mobile-menu"
    >
      {isOpen ? <X size={22} /> : <Menu size={22} />}
    </button>
  );
}
