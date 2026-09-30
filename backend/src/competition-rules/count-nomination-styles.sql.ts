// How many styles (programs) the nomination $1 holds.
export const COUNT_NOMINATION_STYLES_SQL = `
  SELECT COUNT(*)::int AS styles
    FROM nomination_categories nc
    JOIN categories c ON c.id = nc."categoryId"
   WHERE nc."nominationId" = $1 AND c.type = 'style'`;
