import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Handshake,
  PhoneCall,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { Container } from "@/components/layout/Container/Container";
import {
  normalizePhoneHref,
  publicSupportSettings,
} from "@/services/supportContent";
import styles from "./AboutPage.module.css";

const principles = [
  {
    title: "Підбір без зайвих позицій",
    description:
      "Комплектуємо замовлення під етап робіт, щоб на об'єкті не накопичувалися непотрібні матеріали.",
    icon: Handshake,
  },
  {
    title: "Логістика під графік бригади",
    description:
      "Погоджуємо доставку, самовивіз і техніку так, щоб матеріали приїжджали тоді, коли вони реально потрібні.",
    icon: Truck,
  },
  {
    title: "Відповідальність після продажу",
    description:
      "Не зникаємо після рахунку: допомагаємо з уточненнями, замінами, повторними відвантаженнями та сервісними питаннями.",
    icon: ShieldCheck,
  },
] as const;

const workflow = [
  {
    step: "01",
    title: "Отримуємо задачу",
    description:
      "Менеджер уточнює тип об'єкта, етап робіт, бюджет і дедлайни, щоб запропонувати не просто товар, а робочий сценарій закупівлі.",
  },
  {
    step: "02",
    title: "Збираємо комплект",
    description:
      "Формуємо добірку матеріалів, аналогів і супутніх позицій, які не створюють конфліктів між собою та відповідають умовам монтажу.",
  },
  {
    step: "03",
    title: "Доводимо до відвантаження",
    description:
      "Погоджуємо оплату, транспорт і час подачі, після чого команда супроводжує замовлення до отримання на об'єкті або складі.",
  },
] as const;

const contactPhoneHref = normalizePhoneHref(publicSupportSettings.contactPhone);

export const metadata: Metadata = {
  title: "Про нас | Будлідер",
  description:
    "Про команду Будлідер, принципи роботи, логістику та контакти для підбору будівельних матеріалів.",
};

export default function AboutPage() {
  return (
    <>
      <section
        className="brand-page-section"
        aria-labelledby="about-page-title"
      >
        <Container>
          <div className={styles.heroFrame}>
            <div className={styles.heroLayout}>
              <div className={styles.heroContent}>
                <p className={styles.sectionEyebrow}>Про БудЛідер</p>
                <h1 id="about-page-title" className={styles.heroTitle}>
                  Постачаємо будівельні матеріали так, щоб замовлення працювало
                  на темп вашого об&apos;єкта
                </h1>
                <p className={styles.heroDescription}>
                  {publicSupportSettings.storeName} поєднує підбір матеріалів,
                  консультацію та логістику в один процес. Для приватного
                  ремонту, бригади чи невеликого забудовника це означає простіше
                  планування, менше ручних уточнень і швидший старт робіт.
                </p>

                <ul className={styles.heroPills}>
                  <li className="brand-pill">Підбір під етап робіт</li>
                  <li className="brand-pill">Доставка та самовивіз</li>
                  <li className="brand-pill">Підтримка після замовлення</li>
                </ul>

                <div className={styles.heroActions}>
                  <Link href="/catalog" className="brand-button">
                    Перейти в каталог
                  </Link>
                  <a href={contactPhoneHref} className="brand-button-secondary">
                    Зателефонувати менеджеру
                  </a>
                </div>
              </div>

              <aside
                className={styles.heroPanel}
                aria-label="Коротко про компанію"
              >
                <div className={styles.heroPanelHead}>
                  <div className="brand-icon-badge">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <p className={styles.heroPanelLabel}>Як працюємо</p>
                    <p className={styles.heroPanelTitle}>
                      Один контакт для підбору, закупівлі та доставки
                    </p>
                  </div>
                </div>

                <p className={styles.heroPanelCopy}>
                  Працюємо з запитами від кількох позицій до комплексної
                  комплектації. Координуємо замовлення телефоном, через email і
                  допомагаємо адаптувати склад, якщо на об&apos;єкті змінюється
                  план.
                </p>

                <ul className={styles.heroStats}>
                  <li className={styles.statCard}>
                    <span className={styles.statValue}>Каталог + сервіс</span>
                    <span className={styles.statLabel}>
                      товари, консультації та техніка в одному місці
                    </span>
                  </li>
                  <li className={styles.statCard}>
                    <span className={styles.statValue}>
                      {publicSupportSettings.officeAddress}
                    </span>
                    <span className={styles.statLabel}>
                      точка координації замовлень і відвантаження
                    </span>
                  </li>
                </ul>
              </aside>
            </div>
          </div>
        </Container>
      </section>

      <section
        className="brand-page-section"
        aria-labelledby="about-principles-title"
      >
        <Container>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Наш підхід</p>
            <h2 id="about-principles-title" className={styles.sectionTitle}>
              Будуємо процес навколо реальних задач замовника
            </h2>
          </div>

          <ul className={styles.valueGrid}>
            {principles.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.title} className={styles.valueCard}>
                  <div className={styles.valueIcon}>
                    <Icon size={22} />
                  </div>
                  <h3 className={styles.valueTitle}>{item.title}</h3>
                  <p className={styles.valueDescription}>{item.description}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      <section
        className="brand-page-section"
        aria-labelledby="about-workflow-title"
      >
        <Container>
          <div className={styles.storyLayout}>
            <div className={styles.storyCard}>
              <div className={styles.sectionHeaderLeft}>
                <p className={styles.sectionEyebrow}>Як виглядає співпраця</p>
                <h2
                  id="about-workflow-title"
                  className={styles.sectionTitleLeft}
                >
                  Від першого дзвінка до відвантаження без хаосу в комунікації
                </h2>
              </div>

              <ol className={styles.storyList}>
                {workflow.map((item) => (
                  <li key={item.step} className={styles.storyItem}>
                    <span className={styles.storyIndex}>{item.step}</span>
                    <div>
                      <h3 className={styles.storyTitle}>{item.title}</h3>
                      <p className={styles.storyDescription}>
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside
              className={styles.contactCard}
              aria-labelledby="about-contact-title"
            >
              <div className={styles.contactHead}>
                <div className="brand-icon-badge">
                  <PhoneCall size={24} />
                </div>
                <div>
                  <p className={styles.sectionEyebrow}>Контакт з командою</p>
                  <h2
                    id="about-contact-title"
                    className={styles.sectionTitleLeft}
                  >
                    Якщо потрібна консультація, виходьте напряму
                  </h2>
                </div>
              </div>

              <dl className={styles.contactList}>
                <div className={styles.contactItem}>
                  <dt className={styles.contactLabel}>Телефон</dt>
                  <dd className={styles.contactValue}>
                    <a href={contactPhoneHref}>
                      {publicSupportSettings.contactPhone}
                    </a>
                  </dd>
                </div>
                <div className={styles.contactItem}>
                  <dt className={styles.contactLabel}>Email</dt>
                  <dd className={styles.contactValue}>
                    <a
                      href={`mailto:${publicSupportSettings.notificationEmail}`}
                    >
                      {publicSupportSettings.notificationEmail}
                    </a>
                  </dd>
                </div>
                <div className={styles.contactItem}>
                  <dt className={styles.contactLabel}>Адреса</dt>
                  <dd className={styles.contactValue}>
                    {publicSupportSettings.officeAddress}
                  </dd>
                </div>
              </dl>

              <ul className={styles.scheduleList}>
                {publicSupportSettings.workSchedule.map((item) => (
                  <li key={item} className={styles.scheduleItem}>
                    {item}
                  </li>
                ))}
              </ul>

              <div className={styles.quickLinks}>
                <Link href="/contacts" className={styles.quickLink}>
                  Контакти
                  <ArrowRight size={18} />
                </Link>
                <Link href="/services" className={styles.quickLink}>
                  Послуги
                  <ArrowRight size={18} />
                </Link>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}
