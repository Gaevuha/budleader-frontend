"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { HelpFaqContent } from "@/services/supportContent";
import styles from "./HelpPage.module.css";

interface HelpFaqProps {
  items: HelpFaqContent[];
}

export function HelpFaq({ items }: HelpFaqProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentQueryParam = searchParams.get("faq") ?? "";
  const [query, setQuery] = useState(currentQueryParam);
  const searchId = useId();

  useEffect(() => {
    setQuery(currentQueryParam);
  }, [currentQueryParam]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery === currentQueryParam) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());

    if (trimmedQuery) {
      nextParams.set("faq", trimmedQuery);
    } else {
      nextParams.delete("faq");
    }

    const queryString = nextParams.toString();
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const nextUrl = `${pathname}${queryString ? `?${queryString}` : ""}${hash}`;

    router.replace(nextUrl, { scroll: false });
  }, [currentQueryParam, pathname, query, router, searchParams]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [item.question, item.answer, ...item.keywords]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
  const singleMatchedId =
    normalizedQuery.length > 0 && filteredItems.length === 1
      ? filteredItems[0]?.id
      : null;
  const singleMatchRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (!singleMatchedId || !singleMatchRef.current) {
      return;
    }

    singleMatchRef.current.open = true;
    singleMatchRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [singleMatchedId]);

  return (
    <div className={styles.faqSearchLayout}>
      <div className={styles.faqToolbar}>
        <label htmlFor={searchId} className={styles.faqSearchLabel}>
          Пошук по FAQ
        </label>
        <div className={styles.faqSearchField}>
          <Search size={18} className={styles.faqSearchIcon} />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Наприклад: доставка, оплата, повернення"
            className={styles.faqSearchInput}
          />
        </div>
        <p className={styles.faqSearchMeta}>
          {filteredItems.length === items.length && !normalizedQuery
            ? `Показано всі питання: ${items.length}`
            : `Знайдено: ${filteredItems.length}. Посилання оновлюється через параметр faq в URL.`}
        </p>
      </div>

      <div className={styles.faqList} id="faq-list">
        {filteredItems.map((item) => (
          <details
            key={item.id}
            ref={item.id === singleMatchedId ? singleMatchRef : null}
            className={`${styles.faqItem} ${
              item.id === singleMatchedId ? styles.faqItemHighlighted : ""
            }`}
            id={`faq-${item.id}`}
            open={item.id === singleMatchedId ? true : undefined}
          >
            <summary className={styles.faqQuestion}>{item.question}</summary>
            <p className={styles.faqAnswer}>{item.answer}</p>
          </details>
        ))}

        {filteredItems.length === 0 ? (
          <div className={styles.faqEmptyState}>
            Нічого не знайдено. Спробуйте інші ключові слова або зверніться до
            підтримки напряму.
          </div>
        ) : null}
      </div>
    </div>
  );
}
