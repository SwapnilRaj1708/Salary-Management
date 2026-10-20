/**
 * Version of the HTTP contract between the web app and the API.
 *
 * Bump it only when the web app starts depending on an API change. The web app compares
 * it with the value `/api/health` reports, to notice when it was deployed ahead of the
 * API (docs/architecture.md §10).
 */
export const API_VERSION = 1;
