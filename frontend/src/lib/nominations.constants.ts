// Must match MAX_NOMINATIONS_PER_REQUEST in
// backend/src/nominations/dto/bulk-create-nominations.dto.ts — the server
// rejects a single bulk-create request larger than this.
export const MAX_NOMINATIONS_PER_BULK_REQUEST = 2000;

// Must match LIST_QUERY_SEPARATOR in backend/src/nominations/nominations.constants.ts.
export const LIST_QUERY_SEPARATOR = ',';
export const NOMINATIONS_PAGE_SIZE = 50;
