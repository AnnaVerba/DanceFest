import type { QueryInterface } from 'sequelize';

// Lets a migration re-run after a previous attempt partially applied
// itself (Sequelize migrations here aren't wrapped in a transaction).
export async function tableExists(
  queryInterface: QueryInterface,
  tableName: string,
): Promise<boolean> {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT to_regclass(:tableName) AS reg',
    { replacements: { tableName } },
  );
  return (rows[0] as { reg: string | null }).reg !== null;
}
