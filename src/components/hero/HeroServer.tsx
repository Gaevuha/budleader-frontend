import { Clock, Package, Wrench } from "lucide-react";

import { HeroClient, type HeroSlide } from "./HeroClient";
import styles from "./Hero.module.css";

const slides: readonly HeroSlide[] = [
  {
    title: "Будівельні матеріали від «Будлідер»",
    description:
      "Широкий асортимент якісних матеріалів для вашого будівництва за найкращими цінами",
    cta: "Перейти до каталогу",
    link: "/catalog",
  },
  {
    title: "Акційні пропозиції",
    description:
      "Знижки до 50% на популярні товари. Встигніть придбати матеріали за вигідними цінами!",
    cta: "Переглянути акції",
    link: "/#all-sales",
  },
  {
    title: "Професійна консультація",
    description:
      "Наші експерти допоможуть підібрати матеріали та розрахувати необхідну кількість",
    cta: "Зв'язатися з нами",
    link: "/contacts",
  },
] as const;

const heroFeatures = [
  {
    title: "5000+ товарів",
    text: "Все для будівництва",
    Icon: Package,
  },
  {
    title: "Доставка за 24 години",
    text: "По всій Україні",
    Icon: Clock,
  },
  {
    title: "Професійна підтримка",
    text: "Консультація 24/7",
    Icon: Wrench,
  },
] as const;

export function HeroServer() {
  return (
    <div className={styles.hero}>
      <div className={styles.content}>
        <HeroClient slides={slides} />
      </div>

      <ul className={styles.features}>
        {heroFeatures.map(({ title, text, Icon }, index) => (
          <li
            key={title}
            className={styles.feature}
            style={{ animationDelay: `${index * 100 + 180}ms` }}
          >
            <div className={styles.featureIcon}>
              <Icon className={styles.icon} />
            </div>
            <div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureText}>{text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.bgElements}>
        <div className={styles.bgCircle1} />
        <div className={styles.bgCircle2} />
      </div>
    </div>
  );
}
