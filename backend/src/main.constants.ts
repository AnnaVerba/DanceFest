// A category-template save or a bulk nomination create can carry thousands of
// small objects; Express's 100kb default JSON limit rejects those with a 413
// long before validation runs.
export const JSON_BODY_SIZE_LIMIT = '10mb';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

// Number of reverse proxies in front of the app. A numeric hop count (not
// `true`) keeps clients from spoofing X-Forwarded-For to dodge the rate limit.
export const TRUSTED_PROXY_HOPS = 1;

// Global per-IP cap (req.ip honours X-Forwarded-For via 'trust proxy').
export const RATE_LIMIT_WINDOW_MS = SECONDS_PER_MINUTE * MS_PER_SECOND;
export const RATE_LIMIT_MAX_REQUESTS = 300;
export const RATE_LIMIT_MESSAGE = 'Too many requests, please try again later.';
