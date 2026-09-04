import { NavLink } from 'react-router-dom';
import { getSession } from '../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import styles from './CabinetSidebar.module.css';

interface NavItem {
  to: string;
  label: string;
  show: boolean;
  // Match the path exactly (for '/', which would otherwise always be active).
  end?: boolean;
}

export default function CabinetSidebar() {
  const session = getSession();
  const level = session?.profile.accessLevel;

  const isOrganizer = level ? meetsLevel(level, ACCESS_LEVEL.ORGANIZER) : false;
  const isAdmin = level ? meetsLevel(level, ACCESS_LEVEL.ADMIN) : false;

  const items: NavItem[] = [
    { to: '/profile', label: 'Профіль', show: true },
    { to: '/', label: 'Конкурси', show: true, end: true },
    {
      to: '/my-participants',
      label: 'Мої учасники',
      show: level === ACCESS_LEVEL.COACH,
    },
    { to: '/my-entries', label: 'Мої заявки', show: true },
    { to: '/dashboard', label: 'Мої конкурси', show: isOrganizer },
    {
      to: '/category-templates',
      label: 'Шаблони категорій',
      show: isAdmin,
    },
    {
      to: '/organizer-requests',
      label: 'Заявки на організатора',
      show: isAdmin,
    },
  ];

  return (
    <nav className={styles.nav}>
      {items
        .filter((item) => item.show)
        .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.active}` : styles.link
            }
          >
            {item.label}
          </NavLink>
        ))}
    </nav>
  );
}
