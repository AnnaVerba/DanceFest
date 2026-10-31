import { LEAGUE_CATEGORY_TYPE, LINEUP_CATEGORY_TYPE } from '../categories/category.model';
import { IMPROVISATION_NOMINATION_IDS_SQL } from '../nominations/recompute-entries-improv.sql';

// League and lineups of every nomination in $1 whose duration follows the
// rules: not set by hand and not an improvisation.
export const AUTOMATIC_NOMINATION_AXES_SQL = `
  SELECT n.id,
         MIN(c.name) FILTER (WHERE c.type = '${LEAGUE_CATEGORY_TYPE}') AS "leagueName",
         COALESCE(
           ARRAY_AGG(c.name) FILTER (WHERE c.type = '${LINEUP_CATEGORY_TYPE}'),
           '{}') AS "lineupNames"
    FROM nominations n
    LEFT JOIN nomination_categories nc ON nc."nominationId" = n.id
    LEFT JOIN categories c ON c.id = nc."categoryId"
   WHERE n."competitionId" = $1
     AND n."durationOverridden" = false
     AND n.id NOT IN ${IMPROVISATION_NOMINATION_IDS_SQL}
   GROUP BY n.id`;
