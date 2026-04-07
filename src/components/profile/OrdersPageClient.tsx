"use client";

import { Container } from "@/components/layout/Container/Container";
import { useOrdersQuery } from "@/queries/ordersQueries";

import { ProfileOrdersSection } from "./ProfileOrdersSection";
import { ProfileSkeleton } from "./ProfileSkeleton";
import styles from "./Profile.module.css";

export function OrdersPageClient() {
  const ordersQuery = useOrdersQuery(true);

  if (ordersQuery.isLoading && !ordersQuery.data) {
    return <ProfileSkeleton />;
  }

  return (
    <Container>
      <div className={styles.page}>
        <ProfileOrdersSection
          orders={ordersQuery.data?.orders ?? []}
          isLoading={ordersQuery.isLoading}
          limit={Number.MAX_SAFE_INTEGER}
          showLink={false}
        />
      </div>
    </Container>
  );
}
