import {
  ALLOW_MOCK_SEED_ENV,
  ALLOW_MOCK_SEED_VALUE,
  BLOCKED_NODE_ENVS,
  MOCK_SEED_NOT_ALLOWED_MESSAGE,
  NODE_ENV_KEY,
} from './mock-seed.constants';

// Mock credentials are committed to the repo, so seeding them into a shared
// or production database would hand out a working admin login. Requires an
// explicit local opt-in and never runs under NODE_ENV=production.
export function assertMockSeedAllowed(): void {
  const nodeEnv = process.env[NODE_ENV_KEY];
  const optedIn = process.env[ALLOW_MOCK_SEED_ENV] === ALLOW_MOCK_SEED_VALUE;
  if (!optedIn || (nodeEnv && BLOCKED_NODE_ENVS.includes(nodeEnv))) {
    throw new Error(MOCK_SEED_NOT_ALLOWED_MESSAGE);
  }
}
