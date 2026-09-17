// Opt-in flag for seeders that plant repository-visible credentials.
export const ALLOW_MOCK_SEED_ENV = 'ALLOW_MOCK_SEED';
export const ALLOW_MOCK_SEED_VALUE = 'true';

// sequelize-cli picks its config block from NODE_ENV; these never allow it.
export const NODE_ENV_KEY = 'NODE_ENV';
export const BLOCKED_NODE_ENVS: readonly string[] = ['production'];

export const MOCK_SEED_NOT_ALLOWED_MESSAGE =
  `Refusing to seed the mock admin (fixed, publicly known password). ` +
  `Set ${ALLOW_MOCK_SEED_ENV}=${ALLOW_MOCK_SEED_VALUE} in a local development ` +
  `environment only; it is always blocked when NODE_ENV is production.`;
