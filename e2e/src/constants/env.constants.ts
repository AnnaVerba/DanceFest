/** Where the app under test is served. Override via env vars if a run needs a different target. */
export const FRONTEND_BASE_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173';
export const BACKEND_BASE_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:4000';

export const DEFAULT_ACTION_TIMEOUT_MS = 10_000;
export const DEFAULT_NAVIGATION_TIMEOUT_MS = 15_000;
