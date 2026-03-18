export interface CategorySubgroup {
  name: string;
  links: string[];
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  subcategories?: CategorySubgroup[];
  productsCount?: number;
}

export interface CategoriesData {
  categories: Category[];
}
