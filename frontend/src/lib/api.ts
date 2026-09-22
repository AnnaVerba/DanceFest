// Local dev calls the API directly; the production image is built with
// VITE_API_BASE_URL=/api, so requests go through nginx on the same origin.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
