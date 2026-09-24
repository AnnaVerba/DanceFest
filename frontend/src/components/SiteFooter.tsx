import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  CONTACT_TELEGRAM_HREF,
} from './SiteFooter.constants';
import styles from './SiteFooter.module.css';

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <span className={styles.title}>Контакти</span>
      <a href={CONTACT_PHONE_HREF} className={styles.link}>
        {CONTACT_PHONE_DISPLAY}
      </a>
      <a
        href={CONTACT_TELEGRAM_HREF}
        className={styles.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        Telegram
      </a>
      <a href={CONTACT_EMAIL_HREF} className={styles.link}>
        {CONTACT_EMAIL}
      </a>
    </footer>
  );
}
