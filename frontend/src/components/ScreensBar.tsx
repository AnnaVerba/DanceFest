import { NavLink } from 'react-router-dom';
import styles from './ScreensBar.module.css';

const screens = [
  { label: 'Головна', to: '/' },
  { label: 'Вхід', to: '/login' },
  { label: 'Реєстрація', to: '/register' },
  { label: 'Дашборд', to: '/dashboard' },
  { label: 'Новий конкурс', to: '/competitions/new' },
  { label: 'Перегляд конкурсу', to: '/competitions/preview' },
  { label: 'Кабінет судді', to: '/judge' },
  { label: 'Форма заявки (учасник)', to: '/apply' },
  { label: 'Шаблони категорій', to: '/category-templates' },
  { label: 'Створити шаблон', to: '/category-templates/new' },
];

export default function ScreensBar() {
  return (
    <nav className={styles.screens} aria-label="Швидкий перегляд екранів">
      <span className={styles.label}>Швидкий перегляд екранів:</span>
      {screens.map((screen) => (
        <NavLink
          key={screen.to}
          to={screen.to}
          end={screen.to === '/'}
          className={({ isActive }) =>
            `${styles.chip} ${isActive ? styles.chipActive : ''}`
          }
        >
          {screen.label}
        </NavLink>
      ))}
    </nav>
  );
}
