import Link from "next/link";
import { Container } from "../Container/Container";
import {
  helpQuickLinks,
  normalizePhoneHref,
  publicSupportSettings,
} from "@/services/supportContent";
import styles from "./Footer.module.css";

export const Footer = () => {
  const phoneHref = normalizePhoneHref(publicSupportSettings.contactPhone);

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
                <Link href="/help">Допомога</Link>
              </li>
              {helpQuickLinks.slice(1).map((link) => (
                <li key={link.id}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.column}>
            <h3 className={styles.title}>Контакти</h3>
            <ul className={styles.list}>
              <li>
                <a href={phoneHref} className={styles.contactLink}>
                  {publicSupportSettings.contactPhone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${publicSupportSettings.notificationEmail}`}
                  className={styles.contactLink}
                >
                  {publicSupportSettings.notificationEmail}
                </a>
              </li>
              <li className={styles.text}>
                {publicSupportSettings.officeAddress}
              </li>
            </ul>
          </div>
          <div className={styles.logoColumn}>
            <Link href="/" className={styles.logo}>
              Буд<span className={styles.primaryText}>Лідер</span>
            </Link>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>
            © {new Date().getFullYear()} {publicSupportSettings.storeName}. Всі
            права захищено.
          </p>
        </div>
      </Container>
    </footer>
  );
};
