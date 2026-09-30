// Between venue names when one (merged) group spans several venues.
export const VENUE_LIST_SEPARATOR = ', ';

// Merged groups render as one block, keyed by their shared label.
export const MERGED_BLOCK_KEY_PREFIX = 'merged:';

// Joins a nomination group key with its exit's label: a per-program
// nomination renders one block per program, as the public program does.
export const EXIT_BLOCK_KEY_SEPARATOR = '|';

// A section holding exits of another venue — possible once a nomination is
// moved to another venue after the program was formed.
export const FOREIGN_VENUE_WARNING_PREFIX =
  'У відділенні є виступи іншого майданчика:';
export const FOREIGN_VENUE_WARNING_HINT =
  ' — перенесіть їх у відділення свого майданчика.';
