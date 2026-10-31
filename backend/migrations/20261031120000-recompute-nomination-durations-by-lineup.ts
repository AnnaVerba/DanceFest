import type { QueryInterface } from 'sequelize';

// Nominations keep their own durationLimitSeconds, and until the lineup limit
// started to outrank the league's (resolveNominationDurationSeconds) every
// one of them was stored with its league's value. Re-resolves the automatic
// ones from their competition's rules: the first lineup with a limit wins,
// the league's limit is the fallback. Hand-set durations (durationOverridden)
// and improvisations are left alone, as in applyAxisDurationChanges.
const LEAGUE_TYPE = 'level';
const LINEUP_TYPE = 'lineup';
const STYLE_TYPE = 'style';
const LEAGUE_LIMITS_COLUMN = 'leagueLimits';
const LINEUP_LIMITS_COLUMN = 'lineupLimits';

// The positive limit of the nomination n's first category of `type` that has
// one in the rules column `limitsColumn` of r.
const limitOfAxis = (type: string, limitsColumn: string) => `
  (SELECT (r."${limitsColumn}" ->> btrim(c.name))::int
     FROM nomination_categories nc
     JOIN categories c ON c.id = nc."categoryId"
    WHERE nc."nominationId" = n.id
      AND c.type = '${type}'
      AND jsonb_typeof(r."${limitsColumn}" -> btrim(c.name)) = 'number'
      AND (r."${limitsColumn}" ->> btrim(c.name))::numeric > 0
    ORDER BY c.name
    LIMIT 1)`;

const stylesOfNomination = `
  SELECT 1 FROM nomination_categories nc
    JOIN categories c ON c.id = nc."categoryId"
   WHERE nc."nominationId" = n.id AND c.type = '${STYLE_TYPE}'`;

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE nominations
          SET "durationLimitSeconds" = t.seconds
         FROM (SELECT n.id,
                      COALESCE(${limitOfAxis(LINEUP_TYPE, LINEUP_LIMITS_COLUMN)},
                               ${limitOfAxis(LEAGUE_TYPE, LEAGUE_LIMITS_COLUMN)}) AS seconds
                 FROM nominations n
                 JOIN competition_rules r ON r."competitionId" = n."competitionId"
                WHERE n."durationOverridden" = false
                  AND NOT (EXISTS (${stylesOfNomination})
                       AND NOT EXISTS (${stylesOfNomination}
                                       AND NOT c."isImprovisation"))) t
        WHERE nominations.id = t.id
          AND nominations."durationLimitSeconds" IS DISTINCT FROM t.seconds`,
    );
  },

  // The previous values were the stale ones this fixes.
  down: async () => {},
};
