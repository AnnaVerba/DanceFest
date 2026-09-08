/**
 * Feature flags for temporarily hiding parts of the app.
 * Flip a flag back to `true` to restore the feature everywhere it is gated.
 */
export const FEATURES = {
  /**
   * Judges: the `/judge` screen, the "Судді" tab on the competition page,
   * and the judges step in the new-competition wizard.
   */
  judges: false,
  /**
   * Program / timings module: the "Таймінги" and "Програма" tabs on the
   * competition page (timing rules, section builder — auto-calc of times
   * and pauses, sorting, group merging, drag-and-drop), the
   * `/competitions/:id/schedule` public program page, and the
   * "Програма фестивалю" link.
   */
  schedule: false,
} as const;
