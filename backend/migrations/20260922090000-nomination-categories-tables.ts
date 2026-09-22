import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';
import { tableExists } from './utils/table-exists';

// Осі номінації жили масивом `uuid[]` просто в рядку номінації. Через це:
//
//   * жодного FK — номінація могла посилатися на видалену категорію, і ніщо
//     цього не помічало;
//   * фільтр за осями — операції над масивом (`@>`, `&&`, `unnest`), яких
//     жоден індекс таблиці не покривав: на конкурс у десять тисяч номінацій
//     кожен фільтр перебирав усі рядки конкурсу;
//   * унікальність «одна категорія в номінації один раз» не тримало ніщо.
//
// Зв'язок «багато до багатьох» і є таблицею зв'язку. Після неї фільтр — це
// пошук по btree-індексу, а GIN на масиві не потрібен зовсім.
//
// Бекфіл свідомо йде через JOIN із `categories`: id, яким у довіднику нічого
// не відповідає, під FK не покласти, та вони й не несуть інформації —
// категорії, на яку вони вказували, більше немає.

const LINKS = [
  {
    table: 'nomination_categories',
    owner: 'nominations',
    ownerKey: 'nominationId',
    ownerIndex: 'nomination_categories_nomination_id_idx',
    categoryIndex: 'nomination_categories_category_id_idx',
    uniqueIndex: 'nomination_categories_unique_idx',
  },
  {
    table: 'template_nomination_categories',
    owner: 'template_nominations',
    ownerKey: 'templateNominationId',
    ownerIndex: 'template_nomination_categories_owner_id_idx',
    categoryIndex: 'template_nomination_categories_category_id_idx',
    uniqueIndex: 'template_nomination_categories_unique_idx',
  },
] as const;

const CATEGORY_IDS_COLUMN = 'categoryIds';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    for (const link of LINKS) {
      if (!(await tableExists(queryInterface, link.table))) {
        await queryInterface.createTable(link.table, {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          [link.ownerKey]: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: link.owner, key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          categoryId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'categories', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          createdAt: { type: DataTypes.DATE, allowNull: false },
          updatedAt: { type: DataTypes.DATE, allowNull: false },
        });

        await queryInterface.addIndex(link.table, {
          fields: [link.ownerKey],
          name: link.ownerIndex,
        });
        // Заради нього все й робиться: «усі номінації цієї ліги/віку/стилю»
        // стає пошуком по індексу замість перебору масивів.
        await queryInterface.addIndex(link.table, {
          fields: ['categoryId'],
          name: link.categoryIndex,
        });
        await queryInterface.addIndex(link.table, {
          fields: [link.ownerKey, 'categoryId'],
          unique: true,
          name: link.uniqueIndex,
        });
      }

      const owner = await queryInterface.describeTable(link.owner);
      if (!owner[CATEGORY_IDS_COLUMN]) continue;

      await queryInterface.sequelize.query(
        `INSERT INTO "${link.table}" (id, "${link.ownerKey}", "categoryId", "createdAt", "updatedAt")
         SELECT gen_random_uuid(), o.id, c.id, now(), now()
           FROM "${link.owner}" o
           JOIN categories c ON c.id = ANY(o."${CATEGORY_IDS_COLUMN}")
         ON CONFLICT DO NOTHING`,
      );
      await queryInterface.removeColumn(link.owner, CATEGORY_IDS_COLUMN);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    for (const link of LINKS) {
      const owner = await queryInterface.describeTable(link.owner);
      if (!owner[CATEGORY_IDS_COLUMN]) {
        await queryInterface.addColumn(link.owner, CATEGORY_IDS_COLUMN, {
          type: DataTypes.ARRAY(DataTypes.UUID),
          allowNull: false,
          defaultValue: [],
        });
      }

      await queryInterface.sequelize.query(
        `UPDATE "${link.owner}" o
            SET "${CATEGORY_IDS_COLUMN}" = COALESCE(link.ids, ARRAY[]::uuid[])
           FROM (
             SELECT "${link.ownerKey}" AS owner_id,
                    array_agg("categoryId") AS ids
               FROM "${link.table}"
              GROUP BY "${link.ownerKey}"
           ) AS link
          WHERE link.owner_id = o.id`,
      );
      await queryInterface.dropTable(link.table);
    }
  },
};
