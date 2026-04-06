"use client";

import Link from "next/link";

import { PRODUCT_PLACEHOLDER_SRC } from "@/utils/media";

import { ProfileSection } from "./ProfileSection";
import styles from "./Profile.module.css";

interface ProfileWishlistSectionProps {
  items: Array<{
    id: string;
    name: string;
    price: number;
    image?: string;
  }>;
  isLoading?: boolean;
}

export function ProfileWishlistSection({
  items,
  isLoading = false,
}: ProfileWishlistSectionProps) {
  const previewItems = items.slice(0, 4);

  return (
    <ProfileSection
      title="Обране"
      description="Швидкий доступ до товарів, які ви зберегли на потім."
      aside={
        <Link href="/wishlist" className={styles.sectionLink}>
          Перейти до обраного
        </Link>
      }
    >
      {isLoading ? (
        <div className={styles.collectionGrid}>
          <div className={styles.collectionCardSkeleton} />
          <div className={styles.collectionCardSkeleton} />
        </div>
      ) : previewItems.length > 0 ? (
        <div className={styles.collectionGrid}>
          {previewItems.map((item) => (
            <Link
              key={item.id}
              href={`/product/${item.id}`}
              className={styles.collectionCard}
            >
              <div className={styles.collectionImageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image || PRODUCT_PLACEHOLDER_SRC}
                  alt={item.name}
                  className={styles.collectionImage}
                />
              </div>
              <div className={styles.collectionContent}>
                <p className={styles.collectionTitle}>{item.name}</p>
                <p className={styles.collectionMeta}>
                  {item.price.toLocaleString("uk-UA")} ₴
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyPanel}>
          <p className={styles.emptyPanelTitle}>
            Поки що немає товарів в обраному
          </p>
          <p className={styles.emptyPanelText}>
            Додавайте товари до обраного, щоб швидко повертатися до них із
            профілю.
          </p>
          <Link href="/catalog" className={styles.sectionLink}>
            Перейти до каталогу
          </Link>
        </div>
      )}
    </ProfileSection>
  );
}
