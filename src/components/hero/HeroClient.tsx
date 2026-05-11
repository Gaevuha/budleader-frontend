"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./Hero.module.css";

export interface HeroSlide {
  title: string;
  description: string;
  cta: string;
  link: string;
}

interface HeroClientProps {
  slides: readonly HeroSlide[];
}

export function HeroClient({ slides }: HeroClientProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (slides.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [slides]);

  const activeSlide = slides[currentSlide] ?? slides[0];

  if (!activeSlide) {
    return null;
  }

  return (
    <>
      <div key={currentSlide} className={styles.slideContent}>
        <h1 className={styles.title}>{activeSlide.title}</h1>
        <p className={styles.description}>{activeSlide.description}</p>
        <div>
          <Link
            href={activeSlide.link}
            prefetch={
              activeSlide.link.startsWith("/catalog") ? false : undefined
            }
            className={styles.cta}
          >
            <span>{activeSlide.cta}</span>
            <ArrowRight className={styles.ctaIcon} />
          </Link>
        </div>
      </div>

      <div className={styles.indicators}>
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => setCurrentSlide(index)}
            className={`${styles.indicator} ${
              index === currentSlide ? styles.indicatorActive : ""
            }`}
            aria-label={`Перейти до слайду ${index + 1}`}
          />
        ))}
      </div>
    </>
  );
}
