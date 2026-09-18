// A category-template save or a bulk nomination create can carry thousands of
// small objects; Express's 100kb default JSON limit rejects those with a 413
// long before validation runs.
export const JSON_BODY_SIZE_LIMIT = '10mb';
