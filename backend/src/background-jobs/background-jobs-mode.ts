import { BackgroundJobsMode } from './background-jobs-mode.enum';

export const BACKGROUND_JOBS_MODE_ENV_KEY = 'BACKGROUND_JOBS_MODE';

export const DEFAULT_BACKGROUND_JOBS_MODE = BackgroundJobsMode.Worker;

const KNOWN_MODES: readonly string[] = Object.values(BackgroundJobsMode);

// Read at module-load time (before ConfigModule runs), so it comes straight
// from process.env — on Cloud Run that is a real injected env var; locally
// the default covers the common case and switching modes needs the var
// exported in the shell, not just placed in .env.
export function resolveBackgroundJobsMode(
  raw: string | undefined,
): BackgroundJobsMode {
  if (!raw) {
    return DEFAULT_BACKGROUND_JOBS_MODE;
  }
  if (!KNOWN_MODES.includes(raw)) {
    throw new Error(
      `${BACKGROUND_JOBS_MODE_ENV_KEY} must be one of ${KNOWN_MODES.join(
        ', ',
      )} (got "${raw}")`,
    );
  }
  return raw as BackgroundJobsMode;
}

export function currentBackgroundJobsMode(): BackgroundJobsMode {
  return resolveBackgroundJobsMode(process.env[BACKGROUND_JOBS_MODE_ENV_KEY]);
}
