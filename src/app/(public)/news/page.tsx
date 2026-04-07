import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Newspaper, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/Container/Container";
import styles from "./NewsPage.module.css";

const featuredStory = {
  category: "Оновлення сервісу",
  title: "БудЛідер прискорює обробку замовлень і заявок на спецтехніку",
  date: "7 квітня 2026",
  description:
    "Ми синхронізували каталог, сервісні заявки та контактні сценарії в єдину публічну систему сторінок, щоб користувач бачив однакову структуру і стиль на всіх ключових маршрутах.",
};

const updates = [
  {
    title: "Єдиний page-shell для публічних маршрутів",
    description:
      "Новий каркас сторінок тримає одну і ту ж ієрархію секцій, контейнерів і branded блоків.",
    date: "7 квітня 2026",
  },
  {
    title: "Покращені рамки, картки та ікон-бейджі",
    description:
      "Бордюри, тіні та градієнти узгоджені з зеленим стилем бренду без випадкових відмінностей між сторінками.",
    date: "6 квітня 2026",
  },
  {
    title: "Каталог і сервіси приведені до спільної семантики",
    description:
      "Публічні сторінки тепер використовують однакову логіку секцій, контейнерів і контентних блоків.",
    date: "5 квітня 2026",
  },
];

const highlights = [
  "Оновлення каталогу та швидших сценаріїв навігації",
  "Стандартизація публічних сторінок і reusable shell-компонентів",
  "Посилення впізнаваного брендингу для рамок, кнопок і поверхонь",
];

export const metadata: Metadata = {
  title: "Новини | Будлідер",
  description: "Оновлення продукту, каталогу та сервісів Будлідер.",
};

export default function NewsPage() {
  return (
    <>
      <section className="brand-page-section" aria-labelledby="news-page-title">
        <Container>
          <div className={`${styles.heroFrame} brand-card`}>
            <header className={styles.heroHeader}>
              <p className={styles.sectionEyebrow}>Новини БудЛідер</p>
              <h1 id="news-page-title" className={styles.heroTitle}>
                Оновлення, анонси та внутрішні зміни сервісу
              </h1>
              <p className={styles.heroDescription}>
                Сторінка для ключових продуктових змін, нових сценаріїв
                замовлення та всього, що впливає на користувацький досвід
                каталогу і сервісів.
              </p>
              <ul className={styles.heroActions}>
                <li>
                  <span className="brand-pill">
                    <Newspaper size={16} /> Продуктові новини
                  </span>
                </li>
                <li>
                  <span className="brand-pill">
                    <ShieldCheck size={16} /> Системні оновлення
                  </span>
                </li>
              </ul>
            </header>

            <div className={styles.heroGrid}>
              <article className={`${styles.featuredCard} brand-card`}>
                <p className={styles.featuredCategory}>
                  {featuredStory.category}
                </p>
                <h2 className={styles.featuredTitle}>{featuredStory.title}</h2>
                <div className={styles.featuredMeta}>
                  <span className="brand-pill">
                    <CalendarDays size={16} /> {featuredStory.date}
                  </span>
                </div>
                <p className={styles.featuredDescription}>
                  {featuredStory.description}
                </p>
                <Link href="/catalog" className="brand-button-secondary">
                  Перейти в каталог <ArrowRight size={16} />
                </Link>
              </article>

              <ul className={styles.heroAside}>
                {highlights.map((item) => (
                  <li key={item} className={styles.highlightItem}>
                    <div className="brand-icon-badge">
                      <Newspaper size={20} />
                    </div>
                    <p>{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="brand-page-section" aria-labelledby="news-feed-title">
        <Container>
          <div className={`${styles.feedFrame} brand-card`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Стрічка оновлень</p>
                <h2 id="news-feed-title" className={styles.sectionTitle}>
                  Що змінилось останнім часом
                </h2>
              </div>
              <p className={styles.sectionDescription}>
                Короткі апдейти по інтерфейсу, сервісних сторінках та змінах у
                публічному шарі сайту.
              </p>
            </div>

            <ul className={styles.cardsGrid}>
              {updates.map((item) => (
                <li key={item.title} className={styles.newsCard}>
                  <span className={styles.newsDate}>{item.date}</span>
                  <h3 className={styles.newsTitle}>{item.title}</h3>
                  <p className={styles.newsDescription}>{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}
