export interface PerformanceDurationResult {
  // On-stage seconds the running order counts for the exit.
  durationSeconds: number;
  // Track seconds past the allowed time that were not counted; 0 when the
  // track fits (tolerance included).
  overageSeconds: number;
}
