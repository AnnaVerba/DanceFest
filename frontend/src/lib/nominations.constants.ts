// Must match MAX_NOMINATIONS_PER_REQUEST in
// backend/src/nominations/dto/bulk-create-nominations.dto.ts — the server
// rejects a single bulk-create request larger than this.
export const MAX_NOMINATIONS_PER_BULK_REQUEST = 2000;
