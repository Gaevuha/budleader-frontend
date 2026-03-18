import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductClient } from "@/components/product/ProductClient";
import { getProductByIdSSR } from "@/services/apiServer";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductByIdSSR(id);

  if (!product) {
    return {
      title: "Товар не знайдено | Будлідер",
      description: "Запитаний товар не знайдено",
    };
  }

  return {
    title: `${product.name} | Будлідер`,
    description: product.description ?? `Купити ${product.name} у Будлідер`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductByIdSSR(id);

  if (!product) {
    notFound();
  }

  return <ProductClient product={product} />;
}
