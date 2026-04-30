import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";

import { Container } from "@/components/layout/Container/Container";
import {
  helpQuickLinks,
  normalizePhoneHref,
  publicSupportSettings,
  supportChannels,
} from "@/services/supportContent";
import styles from "./ContactsPage.module.css";

interface ContactCard {
  icon: LucideIcon;
  title: string;
  primary: string;
  secondary: string;
}

const contactCards: ContactCard[] = [
  {
    icon: Phone,
    title: "Телефони",
    primary: publicSupportSettings.contactPhone,
    secondary: "Приймаємо звернення по замовленнях, доставці та підбору.",
  },
  {
    icon: Mail,
    title: "Email",
    primary: publicSupportSettings.notificationEmail,
    secondary: "Пишіть для консультації, документів і уточнення реквізитів.",
  },
  {
    icon: MapPin,
    title: "Адреса",
    primary: publicSupportSettings.officeAddress,
    secondary: "Склад і відвантаження за попереднім дзвінком",
  },
];

const primaryPhoneHref = normalizePhoneHref(publicSupportSettings.contactPhone);

export const metadata: Metadata = {
  title: "Контакти | Будлідер",
  description: "Контакти, адреса та канали зв'язку Будлідер.",
};

export default function ContactsPage() {
  return (
    <>
      <section
        className="brand-page-section"
        aria-labelledby="contacts-page-title"
      >
        <Container>
          <div className={`${styles.heroFrame} brand-card`}>
            <header className={styles.heroHeader}>
              <p className={styles.sectionEyebrow}>Контакти БудЛідер</p>
              <h1 id="contacts-page-title" className={styles.heroTitle}>
                Зв&apos;язатися з командою, відділом продажу або сервісу
              </h1>
              <p className={styles.heroDescription}>
                Один екран для дзвінків, пошти, адреси відвантаження і робочого
                графіка. Швидкі контакти оформлені в тому ж стилі, що й каталог
                та сторінка послуг, а дані синхронізовані з центром підтримки.
              </p>
              <ul className={styles.heroActions}>
                <li>
                  <Link href={primaryPhoneHref} className="brand-button">
                    Зателефонувати
                  </Link>
                </li>
                <li>
                  <Link
                    href={`mailto:${publicSupportSettings.notificationEmail}`}
                    className="brand-button-secondary"
                  >
                    Написати на email
                  </Link>
                </li>
              </ul>
            </header>

            <ul className={styles.contactGrid}>
              {contactCards.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.title} className={styles.contactCard}>
                    <div className="brand-icon-badge">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h2 className={styles.contactTitle}>{item.title}</h2>
                      <p className={styles.contactPrimary}>{item.primary}</p>
                      <p className={styles.contactSecondary}>
                        {item.secondary}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Container>
      </section>

      <section className="brand-page-section" aria-labelledby="schedule-title">
        <Container>
          <div className={styles.infoGrid}>
            <div className={`${styles.scheduleCard} brand-card`}>
              <div className={styles.scheduleHeader}>
                <div className="brand-icon-badge">
                  <Clock3 size={24} />
                </div>
                <div>
                  <p className={styles.sectionEyebrow}>Графік роботи</p>
                  <h2 id="schedule-title" className={styles.sectionTitle}>
                    Коли зручно звертатися
                  </h2>
                </div>
              </div>
              <ul className={styles.scheduleList}>
                {publicSupportSettings.workSchedule.map((item) => (
                  <li key={item} className={styles.scheduleItem}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${styles.supportCard} brand-card`}>
              <p className={styles.sectionEyebrow}>Швидка навігація</p>
              <h2 className={styles.sectionTitle}>Куди краще писати</h2>
              <ul className={styles.supportList}>
                {supportChannels.map((channel) => (
                  <li key={channel.id} className={styles.supportItem}>
                    <span className={styles.supportLabel}>{channel.title}</span>
                    <span className={styles.supportValue}>{channel.note}</span>
                  </li>
                ))}
              </ul>

              <div className={styles.helpQuickNav}>
                {helpQuickLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={styles.helpQuickLink}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
