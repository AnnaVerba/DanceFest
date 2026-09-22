export const REDIS_HOST_ENV = 'REDIS_HOST';
export const REDIS_PORT_ENV = 'REDIS_PORT';
export const REDIS_USERNAME_ENV = 'REDIS_USERNAME';
export const REDIS_PASSWORD_ENV = 'REDIS_PASSWORD';

// IPv4 literal, not "localhost": Node resolves "localhost" to ::1 first,
// while a Docker-published port binds IPv4 only, so a bare "localhost"
// fails with ECONNREFUSED ::1.
export const DEFAULT_REDIS_HOST = '127.0.0.1';
// Matches docker-compose's REDIS_EXTERNAL_PORT default.
export const DEFAULT_REDIS_PORT = 6380;
