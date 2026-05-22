import { useState } from 'react';
import styles from './Nav.module.css';

const navLinks = [
  { label: 'Головна', href: '#home' },
  { label: 'Конкурси', href: '#competitions' },
  { label: 'Учасники', href: '#participants' },
  { label: 'Суддівство', href: '#judging' },
  { label: 'Контакти', href: '#contacts' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <ul className={`${styles.list} ${open ? styles.open : ''}`}>
        {navLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={styles.link}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <button
        className={styles.burger}
        onClick={() => setOpen((v) => !v)}
        aria-label="Меню"
      >
        <span />
        <span />
        <span />
      </button>
    </nav>
  );
}
