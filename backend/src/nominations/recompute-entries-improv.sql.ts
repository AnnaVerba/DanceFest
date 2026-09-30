// The styles of the nomination `n`, as a correlated EXISTS body; each query
// below appends its own condition on `c`.
const STYLES_OF_NOMINATION = `
  SELECT 1 FROM nomination_categories nc
    JOIN categories c ON c.id = nc."categoryId"
   WHERE nc."nominationId" = n.id AND c.type = 'style'`;

// entries.improv by the planNominationExits rule, for the nominations in $1:
// a per_program entry follows its program's style, any other entry is an
// improvisation when its nomination has styles and all of them are.
export const RECOMPUTE_ENTRIES_IMPROV_SQL = `
  UPDATE entries e
     SET improv = CASE
       WHEN n."exitMode" = 'per_program' AND EXISTS (${STYLES_OF_NOMINATION})
         THEN EXISTS (${STYLES_OF_NOMINATION}
                AND c.name = e.program AND c."isImprovisation")
       ELSE EXISTS (${STYLES_OF_NOMINATION})
         AND NOT EXISTS (${STYLES_OF_NOMINATION} AND NOT c."isImprovisation")
     END
    FROM nominations n
   WHERE n.id = e."nominationId" AND n.id = ANY($1::uuid[])`;

// Ids of nominations that are improvisations as a whole
// (isImprovisationNomination), as a subquery.
export const IMPROVISATION_NOMINATION_IDS_SQL = `
  (SELECT n.id FROM nominations n
    WHERE EXISTS (${STYLES_OF_NOMINATION})
      AND NOT EXISTS (${STYLES_OF_NOMINATION} AND NOT c."isImprovisation"))`;
