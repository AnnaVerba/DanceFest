// Row count per INSERT statement when Sequelize's bulkCreate saves a large
// batch — keeps a single statement (bound-parameter count, lock duration)
// bounded even when the caller passes thousands of records at once.
export const BULK_INSERT_CHUNK_SIZE = 500;
