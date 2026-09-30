import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// Імпровізація — властивість стилю, однакова для всіх конкурсів. Прапорець
// переїжджає з номінацій на рядок стилю, а entries.improv стає похідною
// копією, яку пише лише сервер.
//
// Колонки nominations/template_nominations.allowsImprovisation лишаються
// (їх більше ніхто не читає) — їх прибирає окрема міграція наступного
// релізу, щоб цей можна було відкотити без втрат.
const TABLE = 'categories';
const COLUMN = 'isImprovisation';
// Обидва регістри явно: lower() для кирилиці залежить від LC_CTYPE бази.
const IMPROVISATION_NAME_PATTERNS = ['Імпровіз%', 'імпровіз%'];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[COLUMN]) {
      await queryInterface.addColumn(TABLE, COLUMN, {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      // Назва — лише тут, один раз: далі джерело правди — прапорець.
      // Прапорець номінації переносимо лише з номінацій з ОДНИМ стилем:
      // у змішаній (Корона) він не каже, котрий зі стилів — імпровізація.
      await queryInterface.sequelize.query(
        `UPDATE categories c
            SET "isImprovisation" = true
          WHERE c.type = 'style'
            AND (
              btrim(c.name) LIKE ANY (ARRAY[:patterns])
              OR c.id IN (
                SELECT nc."categoryId"
                  FROM nomination_categories nc
                  JOIN nominations n ON n.id = nc."nominationId"
                 WHERE n."allowsImprovisation" = true
                   AND (SELECT COUNT(*) FROM nomination_categories nc2
                          JOIN categories c2 ON c2.id = nc2."categoryId"
                         WHERE nc2."nominationId" = n.id
                           AND c2.type = 'style') = 1)
              OR c.id IN (
                SELECT tnc."categoryId"
                  FROM template_nomination_categories tnc
                  JOIN template_nominations tn
                    ON tn.id = tnc."templateNominationId"
                 WHERE tn."allowsImprovisation" = true
                   AND (SELECT COUNT(*) FROM template_nomination_categories tnc2
                          JOIN categories c2 ON c2.id = tnc2."categoryId"
                         WHERE tnc2."templateNominationId" = tn.id
                           AND c2.type = 'style') = 1)
            )`,
        { replacements: { patterns: IMPROVISATION_NAME_PATTERNS }, transaction },
      );

      // Те саме правило, що planNominationExits: per_program — стиль
      // програми заявки; інакше — у номінації є стиль і всі її стилі
      // імпровізаційні.
      await queryInterface.sequelize.query(
        `UPDATE entries e
            SET improv = CASE
              WHEN n."exitMode" = 'per_program' AND EXISTS (
                  SELECT 1 FROM nomination_categories nc
                    JOIN categories c ON c.id = nc."categoryId"
                   WHERE nc."nominationId" = n.id AND c.type = 'style')
                THEN EXISTS (
                  SELECT 1 FROM nomination_categories nc
                    JOIN categories c ON c.id = nc."categoryId"
                   WHERE nc."nominationId" = n.id AND c.type = 'style'
                     AND c.name = e.program AND c."isImprovisation")
              ELSE EXISTS (
                  SELECT 1 FROM nomination_categories nc
                    JOIN categories c ON c.id = nc."categoryId"
                   WHERE nc."nominationId" = n.id AND c.type = 'style')
                AND NOT EXISTS (
                  SELECT 1 FROM nomination_categories nc
                    JOIN categories c ON c.id = nc."categoryId"
                   WHERE nc."nominationId" = n.id AND c.type = 'style'
                     AND NOT c."isImprovisation")
            END
           FROM nominations n
          WHERE n.id = e."nominationId"`,
        { transaction },
      );

      // Номінація-імпровізація не має власної тривалості (її час — з
      // таймінгів), як і ті, що були позначені прапорцем раніше.
      await queryInterface.sequelize.query(
        `UPDATE nominations n
            SET "durationLimitSeconds" = NULL
          WHERE n."durationOverridden" = false
            AND EXISTS (
              SELECT 1 FROM nomination_categories nc
                JOIN categories c ON c.id = nc."categoryId"
               WHERE nc."nominationId" = n.id AND c.type = 'style')
            AND NOT EXISTS (
              SELECT 1 FROM nomination_categories nc
                JOIN categories c ON c.id = nc."categoryId"
               WHERE nc."nominationId" = n.id AND c.type = 'style'
                 AND NOT c."isImprovisation")`,
        { transaction },
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[COLUMN]) {
      await queryInterface.removeColumn(TABLE, COLUMN);
    }
  },
};
