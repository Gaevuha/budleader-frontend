import Link from "next/link";
import { ArrowRight, Package, Wrench, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import styles from "./Hero.module.css";

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
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
      link: "/catalog?onSale=true",
    },
    {
      title: "Професійна консультація",
      description:
        "Наші експерти допоможуть підібрати матеріали та розрахувати необхідну кількість",
      cta: "Зв'язатися з нами",
      link: "/contacts",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className={styles.hero}>
      {/* Main Content */}
      <div className={styles.content}>
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className={styles.slideContent}
        >
          <motion.h1
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className={styles.title}
          >
            {slides[currentSlide].title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className={styles.description}
          >
            {slides[currentSlide].description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <Link href={slides[currentSlide].link} className={styles.cta}>
              <span>{slides[currentSlide].cta}</span>
              <ArrowRight className={styles.ctaIcon} />
            </Link>
          </motion.div>
        </motion.div>

        {/* Slide indicators */}
        <div className={styles.indicators}>
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`${styles.indicator} ${
                index === currentSlide ? styles.indicatorActive : ""
              }`}
              aria-label={`Перейти до слайду ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className={styles.features}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={styles.feature}
        >
          <div className={styles.featureIcon}>
            <Package className={styles.icon} />
          </div>
          <div>
            <h3 className={styles.featureTitle}>5000+ товарів</h3>
            <p className={styles.featureText}>Все для будівництва</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={styles.feature}
        >
          <div className={styles.featureIcon}>
            <Clock className={styles.icon} />
          </div>
          <div>
            <h3 className={styles.featureTitle}>Доставка за 24 години</h3>
            <p className={styles.featureText}>По всій Україні</p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={styles.feature}
        >
          <div className={styles.featureIcon}>
            <Wrench className={styles.icon} />
          </div>
          <div>
            <h3 className={styles.featureTitle}>Професійна підтримка</h3>
            <p className={styles.featureText}>Консультація 24/7</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Animated background elements */}
      <div className={styles.bgElements}>
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={styles.bgCircle1}
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={styles.bgCircle2}
        />
      </div>
    </div>
  );
}
