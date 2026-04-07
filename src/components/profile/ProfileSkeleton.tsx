import { Container } from "@/components/layout/Container/Container";

import styles from "./Profile.module.css";

export function ProfileSkeleton() {
  return (
    <Container>
      <div className={styles.skeletonPage}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    </Container>
  );
}
