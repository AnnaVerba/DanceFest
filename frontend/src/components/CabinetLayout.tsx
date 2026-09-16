import type { ReactNode } from 'react';
import styles from './CabinetLayout.module.css';

interface CabinetLayoutProps {
  children: ReactNode;
  // A wider column for table pages, so the table fits without scrolling.
  wide?: boolean;
}

// Constrains a hub page's content column. The nav rail and top bar are
// supplied app-wide by AppShell.
export default function CabinetLayout({ children, wide }: CabinetLayoutProps) {
  return (
    <main
      className={wide ? `${styles.content} ${styles.wide}` : styles.content}
    >
      {children}
    </main>
  );
}
