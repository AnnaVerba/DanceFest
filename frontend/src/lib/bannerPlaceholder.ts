import {
  BANNER_PLACEHOLDER_HASH_FACTOR,
  BANNER_PLACEHOLDER_HASH_SEED,
} from './bannerPlaceholder.constants';

// Picks which crop of the placeholder drape a competition gets. Derived from
// the id rather than the card's position, so a competition keeps the same
// crop across reloads, filters and pages, while neighbours in a row differ.
export function bannerPlaceholderCrop(
  competitionId: string,
  cropCount: number,
): number {
  let hash = BANNER_PLACEHOLDER_HASH_SEED;
  for (const character of competitionId) {
    hash = (hash * BANNER_PLACEHOLDER_HASH_FACTOR + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % cropCount;
}
