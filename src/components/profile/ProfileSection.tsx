import type { ReactNode } from "react";

import styles from "./Profile.module.css";

interface ProfileSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}

export function ProfileSection({
  title,
  description,
  children,
  aside,
}: ProfileSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionDescription}>{description}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
