import { bannerPlaceholderCrop } from '../../lib/bannerPlaceholder';
import styles from './CompetitionBannerPlaceholder.module.css';

// The crops the catalog rotates through. This list is the single source of
// truth for how many there are.
const CROP_CLASS_NAMES = [
  styles.cropOne,
  styles.cropTwo,
  styles.cropThree,
  styles.cropFour,
];

interface CompetitionBannerPlaceholderProps {
  competitionId: string;
}

// Fills the card's banner slot when a competition has no banner image of its
// own: the catalog's soft sand-and-teal drape, shown at a crop picked from
// the competition's id. Decorative, so it stays out of the accessibility tree.
export default function CompetitionBannerPlaceholder({
  competitionId,
}: CompetitionBannerPlaceholderProps) {
  const cropClassName =
    CROP_CLASS_NAMES[bannerPlaceholderCrop(competitionId, CROP_CLASS_NAMES.length)];

  return (
    <span className={`${styles.root} ${cropClassName}`} aria-hidden="true" />
  );
}
