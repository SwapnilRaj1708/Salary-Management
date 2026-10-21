/**
 * Version of the HTTP contract between the web app and the API.
 *
 * Bump it only when the web app starts depending on an API change. `/api/health` reports
 * it, so a tab older than the API could notice a newer contract and offer a reload. v1
 * doesn't act on it (docs/architecture.md §10).
 */
export const API_VERSION = 1;
