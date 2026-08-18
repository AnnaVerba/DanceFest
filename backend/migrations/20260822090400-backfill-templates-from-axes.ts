import type { QueryInterface } from 'sequelize';
import { DataTypes, QueryTypes } from 'sequelize';

// Назви осей із UI (DEFAULT_AXIS_NAMES) → типи спільного довідника.
const AXIS_NAME_TO_TYPE: Record<string, string> = {
  'Кількість учасників': 'participants_count',
  Вік: 'age',
  Рівень: 'level',
  Напрямок: 'direction',
  Дисципліна: 'discipline',
};

// Стеля, щоб бекфіл не згенерував мільйон рядків на одному кривому шаблоні.
const MAX_COMBINATIONS = 2000;

interface TemplateRow {
  id: string;
  name: string;
  axes: { name: string; values: string[] }[] | null;
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const sequelize = queryInterface.sequelize;

    const templates: TemplateRow[] = await sequelize.query(
      'SELECT id, name, axes FROM category_templates',
      { type: QueryTypes.SELECT },
    );

    for (const template of templates) {
      const axes = (template.axes ?? []).filter(
        (axis) => axis && Array.isArray(axis.values) && axis.values.length > 0,
      );
      if (axes.length === 0) continue;

      const resolved: { type: string; values: { id: string; name: string }[] }[] =
        [];
      let skippedAxis = false;

      for (const axis of axes) {
        const type = AXIS_NAME_TO_TYPE[axis.name.trim()];
        if (!type) {
          skippedAxis = true;
          console.warn(
            `[backfill] шаблон "${template.name}": вісь "${axis.name}" не збігається з жодним типом, пропущено`,
          );
          continue;
        }

        const values: { id: string; name: string }[] = [];
        for (const rawValue of axis.values) {
          const name = String(rawValue).trim();
          if (!name) continue;

          const existing: { id: string }[] = await sequelize.query(
            `SELECT id FROM categories
              WHERE "type" = :type AND lower(btrim(name)) = lower(btrim(:name))
              LIMIT 1`,
            { type: QueryTypes.SELECT, replacements: { type, name } },
          );

          if (existing.length > 0) {
            values.push({ id: existing[0].id, name });
            continue;
          }

          const inserted: { id: string }[] = await sequelize.query(
            `INSERT INTO categories (id, name, "type", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), :name, :type, NOW(), NOW())
             RETURNING id`,
            { type: QueryTypes.SELECT, replacements: { type, name } },
          );
          values.push({ id: inserted[0].id, name });
        }

        if (values.length > 0) resolved.push({ type, values });
      }

      if (resolved.length === 0) continue;

      const total = resolved.reduce((acc, axis) => acc * axis.values.length, 1);
      if (total > MAX_COMBINATIONS) {
        console.warn(
          `[backfill] шаблон "${template.name}": ${total} комбінацій, більше за ліміт ${MAX_COMBINATIONS} — пропущено`,
        );
        continue;
      }

      const combos = resolved.reduce<{ id: string; name: string }[][]>(
        (acc, axis) =>
          acc.flatMap((combo) => axis.values.map((value) => [...combo, value])),
        [[]],
      );

      let sortOrder = 0;
      for (const combo of combos) {
        await sequelize.query(
          `INSERT INTO template_nominations
             (id, "templateId", name, price, "allowsImprovisation", "categoryIds", "sortOrder", "createdAt", "updatedAt")
           VALUES
             (gen_random_uuid(), :templateId, :name, NULL, false, ARRAY[:categoryIds]::uuid[], :sortOrder, NOW(), NOW())`,
          {
            replacements: {
              templateId: template.id,
              name: combo.map((c) => c.name).join(' · '),
              categoryIds: combo.map((c) => c.id),
              sortOrder: sortOrder++,
            },
          },
        );
      }

      if (skippedAxis) {
        console.warn(
          `[backfill] шаблон "${template.name}" перенесено частково — дозаповніть категорії вручну`,
        );
      }
    }

    // axes більше не джерело правди. Колонку не видаляємо одразу: спершу
    // перевіряємо бекфіл на реальних даних, дроп — окремою міграцією.
    await queryInterface.changeColumn('category_templates', 'axes', {
      type: DataTypes.JSONB,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query('DELETE FROM template_nominations');
    await queryInterface.sequelize.query(
      `UPDATE category_templates SET axes = '[]'::jsonb WHERE axes IS NULL`,
    );
    await queryInterface.changeColumn('category_templates', 'axes', {
      type: DataTypes.JSONB,
      allowNull: false,
    });
  },
};
