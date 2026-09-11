import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearSession, getSession, saveSession } from './auth';
import type { Session, UserProfile } from './auth';
import { ACCESS_LEVEL } from './roles';

const clear = vi.fn();

vi.mock('./queryClient', () => ({
  queryClient: { clear: (...args: unknown[]) => clear(...args) },
}));

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    birthDate: null,
    accessLevel: ACCESS_LEVEL.COACH,
    schoolId: null,
    coachId: null,
    ...overrides,
  };
}

function session(overrides: Partial<UserProfile> = {}): Session {
  return {
    accessToken: 'token',
    refreshToken: 'refresh',
    profile: profile(overrides),
  };
}

// See .claude/prompt-caching-strategy.md: a cache keyed by search/filters
// only, not by user, must never carry one identity's data into another's
// session — these are the two ways that boundary can be crossed.
describe('saveSession — cache hygiene across identities', () => {
  beforeEach(() => {
    localStorage.clear();
    clear.mockClear();
  });

  it('clears the query cache when a different user is saved over an existing session', () => {
    saveSession(session({ id: 'user-a' }));
    expect(clear).not.toHaveBeenCalled(); // first-ever session — nothing to protect against

    saveSession(session({ id: 'user-b' }));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('clears the query cache when the same user\'s role changes (upgradeLevel)', () => {
    saveSession(session({ id: 'user-a', accessLevel: ACCESS_LEVEL.PARTICIPANT }));
    saveSession(session({ id: 'user-a', accessLevel: ACCESS_LEVEL.COACH }));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('does not clear the cache for a same-identity token refresh', () => {
    saveSession(session({ id: 'user-a', accessLevel: ACCESS_LEVEL.COACH }));
    clear.mockClear();

    // refreshSession() re-saves the same id/role with a new token pair.
    saveSession(session({ id: 'user-a', accessLevel: ACCESS_LEVEL.COACH }));
    expect(clear).not.toHaveBeenCalled();
  });

  it('persists the newest session regardless', () => {
    saveSession(session({ id: 'user-a' }));
    saveSession(session({ id: 'user-b' }));
    expect(getSession()?.profile.id).toBe('user-b');
  });
});

describe('clearSession', () => {
  beforeEach(() => {
    localStorage.clear();
    clear.mockClear();
  });

  it('clears the query cache and drops the stored session', () => {
    saveSession(session());
    clear.mockClear();

    clearSession();

    expect(clear).toHaveBeenCalledTimes(1);
    expect(getSession()).toBeNull();
  });
});
