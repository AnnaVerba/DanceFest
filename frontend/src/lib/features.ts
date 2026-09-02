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
} as const;
