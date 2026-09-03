import type { ReactNode } from 'react';
import styles from './CabinetLayout.module.css';

interface CabinetLayoutProps {
  children: ReactNode;
}

// Constrains a hub page's content column. The nav rail and top bar are
// supplied app-wide by AppShell.
export default function CabinetLayout({ children }: CabinetLayoutProps) {
  return <main className={styles.content}>{children}</main>;
}
