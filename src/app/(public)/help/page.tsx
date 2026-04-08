import type { Metadata } from "next";
import Link from "next/link";
import {
  CircleHelp,
  ClipboardList,
  LifeBuoy,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { Container } from "@/components/layout/Container/Container";
import { HelpFaq } from "./HelpFaq";
import {
  helpFaqItems,
  helpSteps,
  normalizePhoneHref,
  publicSupportSettings,
  supportChannels,
} from "@/services/supportContent";
import styles from "./HelpPage.module.css";

const channelIcons = {
  consultation: MessageCircle,
  orders: PackageCheck,
  delivery: Truck,
} as const;

type ChannelIconId = keyof typeof channelIcons;

export const metadata: Metadata = {
  title: "Допомога | Будлідер",
  description:
    "Сторінка допомоги Будлідер: підтримка по замовленнях, доставці, підбору матеріалів і відповіді на часті питання.",
};

export default function HelpPage() {
  const helpPhoneHref = normalizePhoneHref(publicSupportSettings.contactPhone);

  return (
    <>
      <section className="brand-page-section" aria-labelledby="help-page-title">
        <Container>
          <div className={`${styles.heroFrame} brand-card`}>
            <div className={styles.heroContent}>
              <p className={styles.sectionEyebrow}>Центр допомоги</p>
              <h1 id="help-page-title" className={styles.heroTitle}>
                Підтримка по замовленнях, доставці та підбору матеріалів
              </h1>
              <p className={styles.heroDescription}>
                Сторінка зібрана як швидкий навігатор: куди звертатися, як
                отримати відповідь без зайвих кроків і що підготувати, щоб
                менеджер вирішив питання з першого контакту.
              </p>

              <ul className={styles.heroPills}>
                <li>
                  <a href="#support-channels" className="brand-pill">
                    Підбір товарів
                  </a>
                </li>
                <li>
                  <a href="#help-flow" className="brand-pill">
                    Статус замовлення
                  </a>
                </li>
                <li>
                  <a href="#faq" className="brand-pill">
                    Доставка і самовивіз
                  </a>
                </li>
              </ul>

              <div className={styles.heroActions}>
                <a href={helpPhoneHref} className="brand-button">
                  Отримати допомогу зараз
                </a>
                <a
                  href={`mailto:${publicSupportSettings.notificationEmail}`}
                  className="brand-button-secondary"
                >
                  Написати менеджеру
                </a>
              </div>
            </div>

            <div className={styles.heroAside}>
              <div className={styles.highlightCard}>
                <div className="brand-icon-badge">
                  <LifeBuoy size={24} />
                </div>
                <p className={styles.highlightLabel}>Коли звертатися</p>
                <p className={styles.highlightValue}>
                  Якщо треба швидко підібрати матеріал, уточнити статус
                  замовлення або погодити доставку на об&apos;єкт через команду{" "}
                  {publicSupportSettings.storeName}.
                </p>
              </div>

              <div className={styles.metricGrid}>
                <article className={styles.metricCard}>
                  <span className={styles.metricValue}>10–20 хв</span>
                  <span className={styles.metricLabel}>
                    типова відповідь у робочий час
                  </span>
                </article>
                <article className={styles.metricCard}>
                  <span className={styles.metricValue}>
                    {publicSupportSettings.contactPhone}
                  </span>
                  <span className={styles.metricLabel}>
                    головний номер підтримки і координації замовлень
                  </span>
                </article>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section
        id="support-channels"
        className="brand-page-section"
        aria-labelledby="support-channels-title"
      >
        <Container>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Канали підтримки</p>
            <h2 id="support-channels-title" className={styles.sectionTitle}>
              Оберіть формат звернення під вашу задачу
            </h2>
          </div>

          <ul className={styles.channelsGrid}>
            {supportChannels.map((channel) => {
              const Icon =
                channelIcons[channel.id as ChannelIconId] ?? CircleHelp;

              return (
                <li
                  key={channel.title}
                  className={`${styles.channelCard} brand-card`}
                >
                  <div className={styles.channelIcon}>
                    <div className="brand-icon-badge">
                      <Icon size={24} />
                    </div>
                  </div>

                  <div className={styles.channelBody}>
                    <h3 className={styles.cardTitle}>{channel.title}</h3>
                    <p className={styles.cardDescription}>
                      {channel.description}
                    </p>
                    <p className={styles.channelNote}>{channel.note}</p>
                  </div>

                  {channel.actionHref.startsWith("/") ? (
                    <Link
                      href={channel.actionHref}
                      className="brand-button-secondary"
                    >
                      {channel.actionLabel}
                    </Link>
                  ) : (
                    <a
                      href={channel.actionHref}
                      className="brand-button-secondary"
                    >
                      {channel.actionLabel}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      <section
        id="help-flow"
        className="brand-page-section"
        aria-labelledby="help-flow-title"
      >
        <Container>
          <div className={styles.flowLayout}>
            <div className={`${styles.flowCard} brand-card`}>
              <div className={styles.cardHeader}>
                <div className="brand-icon-badge">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <p className={styles.sectionEyebrow}>Як це працює</p>
                  <h2 id="help-flow-title" className={styles.sectionTitleLeft}>
                    Шлях звернення від питання до рішення
                  </h2>
                </div>
              </div>

              <ol className={styles.stepList}>
                {helpSteps.map((step, index) => (
                  <li key={step.title} className={styles.stepItem}>
                    <span className={styles.stepIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className={styles.stepTitle}>{step.title}</h3>
                      <p className={styles.stepDescription}>
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className={`${styles.policyCard} brand-card`}>
              <div className={styles.cardHeader}>
                <div className="brand-icon-badge">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className={styles.sectionEyebrow}>
                    Що прискорює відповідь
                  </p>
                  <h2 className={styles.sectionTitleLeft}>
                    Підготуйте ці дані перед зверненням
                  </h2>
                </div>
              </div>

              <ul className={styles.policyList}>
                <li className={styles.policyItem}>
                  Номер замовлення або телефон отримувача.
                </li>
                <li className={styles.policyItem}>
                  Назву товару або посилання на позицію з каталогу.
                </li>
                <li className={styles.policyItem}>
                  Місто, адресу та бажаний час доставки.
                </li>
                <li className={styles.policyItem}>
                  Короткий опис задачі, якщо потрібен підбір матеріалів.
                </li>
                <li className={styles.policyItem}>
                  Email для відповіді: {publicSupportSettings.notificationEmail}
                  .
                </li>
              </ul>

              <div className={styles.policyActions}>
                <a
                  href="#faq-delivery-payment"
                  className="brand-button-secondary"
                >
                  Доставка і оплата
                </a>
                <a href="#faq-returns" className="brand-button-secondary">
                  Повернення товару
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section
        id="faq"
        className="brand-page-section"
        aria-labelledby="faq-title"
      >
        <Container>
          <div className={`${styles.faqFrame} brand-card`}>
            <div className={styles.cardHeader}>
              <div className="brand-icon-badge">
                <CircleHelp size={24} />
              </div>
              <div>
                <p className={styles.sectionEyebrow}>FAQ</p>
                <h2 id="faq-title" className={styles.sectionTitleLeft}>
                  Часті питання по допомозі та обслуговуванню
                </h2>
              </div>
            </div>

            <HelpFaq items={helpFaqItems} />
          </div>
        </Container>
      </section>
    </>
  );
}
