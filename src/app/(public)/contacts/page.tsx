import type { Metadata } from "next";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";

import { Container } from "@/components/layout/Container/Container";
import styles from "./ContactsPage.module.css";

const contactCards = [
  {
    icon: Phone,
    title: "Телефони",
    primary: "+380 (68) 686-84-00",
    secondary: "+380 (99) 123-45-67",
  },
  {
    icon: Mail,
    title: "Email",
    primary: "info@budleader.com.ua",
    secondary: "sales@budleader.com.ua",
  },
  {
    icon: MapPin,
    title: "Адреса",
    primary: "Львів, вул. Промислова, 24",
    secondary: "Склад і відвантаження за попереднім дзвінком",
  },
];

const workSchedule = [
  "Пн–Пт: 08:30–18:00",
  "Сб: 09:00–15:00",
  "Нд: прийом онлайн-заявок",
];

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
                та сторінка послуг.
              </p>
              <ul className={styles.heroActions}>
                <li>
                  <a href="tel:+380686868400" className="brand-button">
                    Зателефонувати
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@budleader.com.ua"
                    className="brand-button-secondary"
                  >
                    Написати на email
                  </a>
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
                {workSchedule.map((item) => (
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
                <li className={styles.supportItem}>
                  <span className={styles.supportLabel}>
                    Замовлення товарів
                  </span>
                  <span className={styles.supportValue}>
                    sales@budleader.com.ua
                  </span>
                </li>
                <li className={styles.supportItem}>
                  <span className={styles.supportLabel}>
                    Послуги спецтехніки
                  </span>
                  <span className={styles.supportValue}>
                    info@budleader.com.ua
                  </span>
                </li>
                <li className={styles.supportItem}>
                  <span className={styles.supportLabel}>
                    Терміновий дзвінок
                  </span>
                  <span className={styles.supportValue}>
                    +380 (68) 686-84-00
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
