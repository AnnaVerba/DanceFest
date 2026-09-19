// leagueLimits keys are stored trimmed (see sanitizeLeagueLimits in
// competition-rules.service.ts), so a lookup must trim the same way.
export function resolveLeagueDurationSeconds(
  leagueLimits: Record<string, number>,
  leagueName: string | null,
): number | null {
  const key = leagueName?.trim();
  if (!key) return null;
  const seconds = leagueLimits[key];
  return typeof seconds === 'number' && seconds > 0 ? seconds : null;
}
