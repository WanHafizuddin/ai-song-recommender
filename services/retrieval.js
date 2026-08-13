function buildCandidateQuery(criteria, limit = 30) {
  const { genre, energy, tags } = criteria;
  const params = [];
  const where = [];

  let tagsIdx = null;
  if (Array.isArray(tags) && tags.length > 0) {
    params.push(tags);
    tagsIdx = params.length;
    where.push(`tags && $${tagsIdx}`);
  }

  if (genre) {
    params.push(genre);
    where.push(`genre = $${params.length}`);
  }

  // Relevance score: count of overlapping tags, plus closeness of energy.
  const overlap = tagsIdx
    ? `COALESCE(cardinality(ARRAY(SELECT unnest(tags) INTERSECT SELECT unnest($${tagsIdx}::text[]))), 0)`
    : `0`;

  let energyScore = `0`;
  if (energy !== null && energy !== undefined) {
    params.push(energy);
    energyScore = `(5 - ABS(COALESCE(energy, 3) - $${params.length}))`;
  }

  params.push(limit);
  const limitIdx = params.length;

  const whereClause = where.length ? `WHERE ${where.join(" OR ")}` : "";
  const text = `
    SELECT id, title, artist, genre, energy, tags,
           (${overlap} + ${energyScore}) AS score
    FROM songs
    ${whereClause}
    ORDER BY score DESC, id ASC
    LIMIT $${limitIdx}
  `.trim();

  return { text, params };
}

module.exports = { buildCandidateQuery };
