import { CreationAttributes, Model, ModelStatic, Transaction } from 'sequelize';
import { BULK_INSERT_CHUNK_SIZE } from './bulk-insert.constants';

// Sequelize's bulkCreate has no built-in batching: passing it thousands of
// records in one call becomes a single INSERT with thousands of bound
// parameters. This issues it as several smaller statements instead, all
// inside the caller's transaction so the whole set still commits atomically.
export async function bulkCreateChunked<M extends Model>(
  model: ModelStatic<M>,
  records: CreationAttributes<M>[],
  transaction: Transaction,
): Promise<M[]> {
  const created: M[] = [];
  for (let start = 0; start < records.length; start += BULK_INSERT_CHUNK_SIZE) {
    const chunk = records.slice(start, start + BULK_INSERT_CHUNK_SIZE);
    created.push(...(await model.bulkCreate(chunk, { transaction })));
  }
  return created;
}
