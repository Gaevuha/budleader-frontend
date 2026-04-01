"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Send, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";

import type { AppProduct, ProductReview } from "@/types/app";
import type { Product } from "@/types/product";
import { PRODUCT_PLACEHOLDER_SRC } from "@/utils/media";
import { Container } from "@/components/layout/Container/Container";
import styles from "@/components/product/ProductClient.module.css";
import { submitProductReviewCSR } from "@/services/apiClient";
import { mapApiProductToAppProduct } from "@/services/api";
import { useCartStore } from "@/store/cart/cartStore";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";
import { useAuthStore } from "@/store/auth/authStore";
import {
  useAddToCartMutation,
  useCartQuery,
  useRemoveFromCartMutation,
} from "@/queries/cartQueries";
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useWishlistQuery,
} from "@/queries/wishlistQueries";

interface ProductClientProps {
  product: Product;
}

type RawProduct = Product & {
  reviews?: ProductReview[];
};

export function ProductClient({ product }: ProductClientProps) {
  const localCart = useCartStore((state) => state.cart);
  const addToCartLocal = useCartStore((state) => state.addToCart);
  const removeFromCartLocal = useCartStore((state) => state.removeFromCart);
  const wishlistLocal = useWishlistStore((state) => state.wishlist);
  const toggleWishlistLocal = useWishlistStore((state) => state.toggleWishlist);
  const addToCartMutation = useAddToCartMutation();
  const removeFromCartMutation = useRemoveFromCartMutation();
  const addToWishlistMutation = useAddToWishlistMutation();
  const removeFromWishlistMutation = useRemoveFromWishlistMutation();
  const currentUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);
  const cartQuery = useCartQuery(isAuthenticated);
  const wishlistQuery = useWishlistQuery(isAuthenticated);
  const [optimisticInCart, setOptimisticInCart] = useState<boolean | null>(
    null
  );
  const [optimisticWishlisted, setOptimisticWishlisted] = useState<
    boolean | null
  >(null);

  const [reviewText, setReviewText] = useState("");
  const [selectedRating, setSelectedRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>(
    (product as RawProduct).reviews ?? []
  );
  const [imageFailed, setImageFailed] = useState(false);

  const appProduct = useMemo(() => {
    const mapped = mapApiProductToAppProduct(product);
    if (!mapped) {
      return {
        id: "",
        name: "",
        price: 0,
        image: PRODUCT_PLACEHOLDER_SRC,
        category: "Загальна",
        brand: "Budleader",
        inStock: false,
      } as AppProduct;
    }

    return {
      ...mapped,
      reviews: (product as RawProduct).reviews,
    };
  }, [product]);

  const serverWishlist = wishlistQuery.data?.items ?? [];
  const serverCartItems = cartQuery.data?.items ?? [];
  const effectiveWishlist = isAuthenticated ? serverWishlist : wishlistLocal;
  const isWishlisted = effectiveWishlist.some(
    (item) => item.id === appProduct.id
  );
  const isInCart = isAuthenticated
    ? serverCartItems.some(
        (item) => item.productId === appProduct.id || item.id === appProduct.id
      )
    : localCart.some((item) => item.id === appProduct.id);
  const isWishlistedUi = optimisticWishlisted ?? isWishlisted;
  const isInCartUi = optimisticInCart ?? isInCart;
  const imageSrc = imageFailed ? PRODUCT_PLACEHOLDER_SRC : appProduct.image;

  useEffect(() => {
    setOptimisticInCart(null);
  }, [isInCart]);

  useEffect(() => {
    setOptimisticWishlisted(null);
  }, [isWishlisted]);

  const handleAddToCart = async () => {
    const wasInCart = isInCartUi;
    const cartEntry = serverCartItems.find(
      (item) => item.productId === appProduct.id || item.id === appProduct.id
    );
    const removeProductId = cartEntry?.productId ?? appProduct.id;

    if (isAuthenticated) {
      setOptimisticInCart(!wasInCart);

      try {
        if (wasInCart) {
          await removeFromCartMutation.mutateAsync(removeProductId);
          removeFromCartLocal(appProduct.id);
        } else {
          await addToCartMutation.mutateAsync({
            productId: appProduct.id,
            quantity: 1,
          });
          addToCartLocal(appProduct);
        }
      } catch {
        setOptimisticInCart(wasInCart);
        toast.error("Не вдалося оновити кошик");
        return;
      }
    } else {
      if (wasInCart) {
        removeFromCartLocal(appProduct.id);
      } else {
        addToCartLocal(appProduct);
      }
    }

    toast.success(
      wasInCart ? "Товар видалено з кошика" : "Товар додано у кошик"
    );
  };

  const handleToggleWishlist = async () => {
    const wasWishlisted = isWishlistedUi;

    if (isAuthenticated) {
      setOptimisticWishlisted(!wasWishlisted);

      try {
        if (wasWishlisted) {
          await removeFromWishlistMutation.mutateAsync(appProduct.id);
        } else {
          await addToWishlistMutation.mutateAsync(appProduct.id);
        }

        toggleWishlistLocal(appProduct);
      } catch {
        setOptimisticWishlisted(wasWishlisted);
        toast.error("Не вдалося оновити список бажань");
        return;
      }
    } else {
      toggleWishlistLocal(appProduct);
    }

    toast.success(wasWishlisted ? "Видалено з обраного" : "Додано до обраного");
  };

  const handleReviewSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!currentUser) {
      toast.error("Щоб залишити відгук, увійдіть у акаунт");
      return;
    }

    const trimmedText = reviewText.trim();

    setIsSubmittingReview(true);

    try {
      const persistedReview = await submitProductReviewCSR({
        productId: appProduct.id,
        rating: selectedRating,
        text: trimmedText.length > 0 ? trimmedText : undefined,
      });

      const review: ProductReview = {
        id: persistedReview.id ?? `${Date.now()}`,
        user:
          persistedReview.user ?? currentUser.firstName ?? currentUser.email,
        text: persistedReview.text ?? trimmedText,
        date: persistedReview.date ?? new Date().toLocaleDateString("uk-UA"),
        rating: persistedReview.rating ?? selectedRating,
      };

      setReviews((prev) => [review, ...prev]);
      setReviewText("");
      setSelectedRating(5);
      toast.success("Оцінку та відгук збережено");
    } catch (error) {
      const backendMessage =
        typeof error === "object" &&
        error &&
        "response" in error &&
        typeof (
          error as {
            response?: {
              data?: {
                error?: { message?: string };
                message?: string;
              };
            };
          }
        ).response?.data?.error?.message === "string"
          ? (
              error as {
                response?: { data?: { error?: { message?: string } } };
              }
            ).response?.data?.error?.message
          : typeof (
              error as {
                response?: { data?: { message?: string } };
              }
            ).response?.data?.message === "string"
          ? (
              error as {
                response?: { data?: { message?: string } };
              }
            ).response?.data?.message
          : error instanceof Error
          ? error.message
          : null;

      toast.error(
        backendMessage ?? "Не вдалося зберегти оцінку. Спробуйте ще раз"
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <Container className={styles.page}>
      <div className={styles.breadcrumbs}>
        <Link href="/">Головна</Link>
        <span>/</span>
        <Link href="/catalog">Каталог</Link>
        <span>/</span>
        <Link
          href={`/catalog?category=${encodeURIComponent(
            appProduct.categoryId ?? appProduct.category
          )}`}
        >
          {appProduct.category}
        </Link>
        <span>/</span>
        <span className={styles.current}>{appProduct.name}</span>
      </div>

      <div className={styles.productLayout}>
        <div className={styles.imageGallery}>
          <Image
            src={imageSrc}
            alt={appProduct.name}
            className={styles.mainImage}
            width={460}
            height={460}
            unoptimized
            onError={() => setImageFailed(true)}
          />
        </div>

        <div className={styles.productInfo}>
          <h1 className={styles.title}>{appProduct.name}</h1>

          <div className={styles.statusRow}>
            {appProduct.inStock ? (
              <span className={styles.inStock}>В наявності</span>
            ) : (
              <span className={styles.outOfStock}>Немає в наявності</span>
            )}
            <span className={styles.code}>Код: {appProduct.id}</span>
          </div>

          <div className={styles.priceBlock}>
            {appProduct.oldPrice && (
              <div className={styles.oldPrice}>{appProduct.oldPrice} грн</div>
            )}
            <div className={styles.price}>{appProduct.price} грн</div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.addToCartBtn}
              disabled={!appProduct.inStock}
              onClick={handleAddToCart}
            >
              <ShoppingCart size={18} /> {isInCartUi ? "В кошику" : "Купити"}
            </button>
            <button
              className={`${styles.wishlistBtn} ${
                isWishlistedUi ? styles.wishlistActive : ""
              }`}
              onClick={handleToggleWishlist}
            >
              <Heart
                size={18}
                fill={isWishlistedUi ? "currentColor" : "none"}
              />
            </button>
          </div>

          <div className={styles.description}>
            <h3>Опис товару</h3>
            <p>
              {appProduct.description ??
                `Товар бренду ${appProduct.brand}. Доступний у магазині Будлідер.`}
            </p>
          </div>
        </div>
      </div>

      <section className={styles.reviewsSection}>
        <h2 className={styles.reviewsTitle}>Відгуки</h2>

        <div className={styles.reviewsList}>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <article key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <strong>{review.user}</strong>
                  <span className={styles.reviewDate}>{review.date}</span>
                </div>
                <div className={styles.reviewRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      fill={(review.rating ?? 0) >= star ? "#FF9800" : "none"}
                      color="#FF9800"
                    />
                  ))}
                </div>
                <p className={styles.reviewText}>{review.text}</p>
              </article>
            ))
          ) : (
            <p className={styles.noReviews}>Ще немає відгуків.</p>
          )}
        </div>

        <form className={styles.reviewForm} onSubmit={handleReviewSubmit}>
          <h3>Залишити відгук</h3>
          <div className={styles.ratingInputBlock}>
            <span className={styles.ratingInputLabel}>Ваша оцінка:</span>
            <div className={styles.ratingInputStars}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= selectedRating;

                return (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.ratingStarBtn} ${
                      active ? styles.ratingStarBtnActive : ""
                    }`}
                    onClick={() => setSelectedRating(star)}
                    aria-label={`Оцінити на ${star} з 5`}
                  >
                    <Star size={18} fill={active ? "currentColor" : "none"} />
                  </button>
                );
              })}
            </div>
            <span className={styles.ratingInputValue}>{selectedRating}.0</span>
          </div>
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="Поділіться враженнями про товар (необов'язково)"
            rows={4}
          />
          <button
            type="submit"
            className={styles.submitReviewBtn}
            disabled={isSubmittingReview}
          >
            <Send size={16} /> Відправити
          </button>
        </form>
      </section>
    </Container>
  );
}
