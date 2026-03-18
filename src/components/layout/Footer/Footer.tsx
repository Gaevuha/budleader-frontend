import Link from "next/link";
import { Container } from "../Container/Container";
import styles from "./Footer.module.css";

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.grid}>
          <div className={styles.column}>
            <h3 className={styles.title}>Про БудЛідер</h3>
            <ul className={styles.list}>
              <li>
                <Link href="/about">Про нас</Link>
              </li>
              <li>
                <Link href="/news">Новини</Link>
              </li>
              <li>
                <Link href="/contacts">Контакти</Link>
              </li>
            </ul>
          </div>
          <div className={styles.column}>
            <h3 className={styles.title}>Клієнтам</h3>
            <ul className={styles.list}>
              <li>
                <Link href="/catalog">Каталог</Link>
              </li>
              <li>
                <Link href="/services">Послуги</Link>
              </li>
              <li>
                <Link href="/help">Доставка і оплата</Link>
              </li>
              <li>
                <Link href="/help">Повернення товару</Link>
              </li>
            </ul>
          </div>
          <div className={styles.column}>
            <h3 className={styles.title}>Контакти</h3>
            <p className={styles.text}>+380 (99) 123-45-67</p>
            <p className={styles.text}>068-68-68-400</p>
            <p className={styles.text}>info@budleader.com.ua</p>
          </div>
          <div className={styles.logoColumn}>
            <Link href="/" className={styles.logo}>
              Буд<span className={styles.primaryText}>Лідер</span>
            </Link>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} БудЛідер. Всі права захищено.</p>
        </div>
      </Container>
    </footer>
  );
};
