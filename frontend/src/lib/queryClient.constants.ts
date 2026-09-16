// Cache tuning for React Query. See .claude/prompt-caching-strategy.md for
// the rationale behind each value.

export const QUERY_DEFAULT_STALE_TIME_MS = 30_000;
export const QUERY_DEFAULT_GC_TIME_MS = 5 * 60_000;
export const QUERY_DEFAULT_RETRY_COUNT = 1;

// Публічний список конкурсів: рідко змінюється, сторінка публічна.
export const PUBLIC_COMPETITIONS_STALE_TIME_MS = 10 * 60_000;

// Довідники (ліги, стилі, шаблони категорій): оновлюються лише через явну
// інвалідацію після редагування адміністратором.
export const REFERENCE_STALE_TIME_MS = Infinity;

// Користувач/роль/права: ніколи не показуємо з кешу без перевірки.
export const ME_STALE_TIME_MS = 0;

// Список заявок — основний робочий екран, дані змінюються часто.
export const APPLICATIONS_STALE_TIME_MS = 15_000;

// Учасники (CRUD тренером).
export const PARTICIPANTS_STALE_TIME_MS = 60_000;

// Сторінка таймінгів/програми.
export const TIMING_STALE_TIME_MS = 10_000;

// Доплати за час і переліміти — це гроші, тому без кешу: завжди перевіряємо
// сервер перед показом (див. .claude/prompt-caching-strategy.md).
export const OVERAGES_STALE_TIME_MS = 0;
