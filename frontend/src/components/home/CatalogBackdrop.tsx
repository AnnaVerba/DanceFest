import styles from './CatalogBackdrop.module.css';

// Thin ornamental curves behind the whole app, traced from the catalog
// design's 1623×969 frame: two curves meeting on the left and looping out
// through the top edge, two brackets hugging the left edge, and long teal and
// sand arcs sweeping to the right edge with a loop near the top right. Fixed
// to the viewport behind every page (App renders it once). Purely decorative:
// hidden from assistive tech.
export default function CatalogBackdrop() {
  return (
    <svg
      className={styles.root}
      viewBox="0 0 1623 969"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className={styles.cool} d="M0 250 C 70 190, 160 150, 300 140 C 420 132, 500 140, 560 100 C 610 66, 640 30, 690 0" />
      <path className={styles.cool} d="M0 196 C 110 150, 230 132, 360 150 C 450 162, 520 150, 560 110 C 590 80, 600 40, 605 0" />
      <path className={styles.cool} d="M0 330 C 30 332, 55 360, 62 420 C 70 500, 50 600, 0 690" />
      <path className={styles.cool} d="M0 425 C 28 432, 44 470, 46 520 C 48 580, 30 630, 0 668" />
      <path className={styles.cool} d="M805 690 C 900 600, 1050 500, 1190 430 C 1290 380, 1370 300, 1440 230 C 1520 160, 1580 150, 1623 155" />
      <path className={styles.cool} d="M1250 470 C 1330 400, 1390 330, 1410 270 C 1430 220, 1460 205, 1520 205 C 1570 205, 1600 210, 1623 215" />
      <path className={styles.cool} d="M1180 600 C 1350 560, 1500 520, 1623 470" />
      <path className={styles.warm} d="M880 540 C 980 440, 1100 380, 1250 355 C 1400 330, 1520 310, 1623 220" />
      <path className={styles.warm} d="M1350 310 C 1450 295, 1550 280, 1623 260" />
      <path className={styles.warm} d="M1180 0 C 1260 90, 1420 150, 1623 140" />
      <path className={styles.warm} d="M1300 0 C 1360 55, 1470 95, 1623 80" />
    </svg>
  );
}
