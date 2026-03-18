"use client";

import { Container } from "@/components/layout/Container/Container";
import { ProductCard } from "@/components/product/ProductCard/ProductCard";
import Link from "next/link";
import { Heart } from "lucide-react";
import styles from "./Wishlist.module.css";
import { motion } from "framer-motion";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";

const WishlistPage = () => {
  const wishlist = useWishlistStore((state) => state.wishlist);

  return (
    <Container className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Обрані товари</h1>
        <span className={styles.count}>{wishlist.length} товарів</span>
      </div>

      {wishlist.length === 0 ? (
        <div className={styles.empty}>
          <Heart size={64} className={styles.emptyIcon} />
          <h2>Ваш список бажань порожній</h2>
          <p>Додайте товари, які вам сподобалися, щоб не загубити їх.</p>
          <Link href="/catalog" className={styles.continueBtn}>
            Перейти до каталогу
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {wishlist.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      )}
    </Container>
  );
};

export default WishlistPage;
