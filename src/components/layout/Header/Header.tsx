import { Suspense } from "react";
import type { Category } from "@/types/category";
import type { ThemeMode } from "@/types/app";
import { HeaderServer } from "./HeaderServer";

export interface HeaderProps {
  categories: Category[];
  initialTheme: ThemeMode;
}

export const Header = ({ categories, initialTheme }: HeaderProps) => {
  return (
    <Suspense fallback={null}>
      <HeaderServer categories={categories} initialTheme={initialTheme} />
    </Suspense>
  );
};
