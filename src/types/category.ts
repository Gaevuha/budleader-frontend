export interface CategorySubcategoryLink {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
}

export interface CategorySubgroup {
  name: string;
  links: Array<string | CategorySubcategoryLink>;
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
