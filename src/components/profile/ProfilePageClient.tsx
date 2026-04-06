"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Container } from "@/components/layout/Container/Container";
import { useUser } from "@/queries/authQueries";
import { useOrdersQuery } from "@/queries/ordersQueries";
import { useWishlistQuery } from "@/queries/wishlistQueries";
import { resolveMediaUrl } from "@/utils/media";
import type { User } from "@/types/auth";

import { ProfileOrdersSection } from "./ProfileOrdersSection";
import { PasswordChangeForm } from "./PasswordChangeForm";
import { ProfileDetailsForm } from "./ProfileDetailsForm";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { ProfileWishlistSection } from "./ProfileWishlistSection";
import styles from "./Profile.module.css";

interface ProfilePageClientProps {
  initialUser: User;
}

const formatRegistrationDate = (value?: string): string => {
  if (!value) {
    return "Не вказано";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Не вказано";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

export function ProfilePageClient({ initialUser }: ProfilePageClientProps) {
  const router = useRouter();
  const meQuery = useUser({ initialData: initialUser });
  const currentUser = meQuery.data;
  const wishlistQuery = useWishlistQuery(Boolean(currentUser));
  const ordersQuery = useOrdersQuery(Boolean(currentUser));

  useEffect(() => {
    if (!meQuery.isLoading && !currentUser) {
      router.replace("/login");
    }
  }, [currentUser, meQuery.isLoading, router]);

  if (meQuery.isLoading && !currentUser) {
    return <ProfileSkeleton />;
  }

  if (!currentUser) {
    return (
      <Container>
        <div className={styles.emptyState}>Перенаправлення до входу...</div>
      </Container>
    );
  }

  const displayName =
    currentUser.name ?? currentUser.firstName ?? currentUser.email;
  const favoriteItems = (wishlistQuery.data?.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    image: resolveMediaUrl(item.image),
  }));
  const recentOrders = ordersQuery.data?.orders ?? [];

  return (
    <Container>
      <div className={styles.page}>
        <div className={styles.header}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Особистий кабінет</p>
            <h1 className={styles.title}>{displayName}</h1>
            <p className={styles.subtitle}>
              Керуйте контактними даними, фото профілю та параметрами безпеки в
              одному місці без зайвих переходів.
            </p>
            <div className={styles.heroMeta}>
              <span className={styles.metaPill}>
                {currentUser.role ?? "user"}
              </span>
              <span className={styles.metaPill}>
                Користувач з {formatRegistrationDate(currentUser.createdAt)}
              </span>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Email</span>
              <span className={styles.summaryValue}>{currentUser.email}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Телефон</span>
              <span className={styles.summaryValue}>
                {currentUser.phone || "Не вказано"}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>ID акаунта</span>
              <span className={styles.summaryValue}>{currentUser.id}</span>
            </div>
            <div className={styles.statusRow}>
              <p className={styles.statusText}>
                Дані синхронізуються через запит <strong>/auth/me</strong> і
                оновлюються після збереження.
              </p>
            </div>
          </aside>
        </div>

        <div className={styles.grid}>
          <div className={styles.stack}>
            <ProfileDetailsForm
              key={`${currentUser.id}:${currentUser.updatedAt ?? "base"}`}
              user={currentUser}
            />
            <ProfileWishlistSection
              items={favoriteItems}
              isLoading={wishlistQuery.isLoading}
            />
          </div>
          <div className={styles.stack}>
            <PasswordChangeForm />
            <ProfileOrdersSection
              orders={recentOrders}
              isLoading={ordersQuery.isLoading}
            />
          </div>
        </div>
      </div>
    </Container>
  );
}
