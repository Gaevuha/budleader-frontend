export interface FeatureItem {
  id: string;
  title: string;
  desc: string;
  icon?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  price: string;
  image: string;
  icon?: string;
}

export interface CatalogFilterGroup {
  id: string;
  name: string;
}
