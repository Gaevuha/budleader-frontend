import type { Category } from "@/types/category";
import type { ThemeMode } from "@/types/app";
import { HeaderServer } from "./HeaderServer";

export interface HeaderProps {
  categories: Category[];
  initialTheme: ThemeMode;
}

export const Header = ({ categories, initialTheme }: HeaderProps) => {
  return <HeaderServer categories={categories} initialTheme={initialTheme} />;
};
