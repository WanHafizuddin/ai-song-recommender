function validateCriteria(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("INVALID_CRITERIA");
  }

  const genre =
    typeof raw.genre === "string" && raw.genre.trim()
      ? raw.genre.trim().toUpperCase()
      : null;

  let energy = null;
  if (raw.energy !== undefined && raw.energy !== null) {
    const n = Number(raw.energy);
    if (Number.isInteger(n) && n >= 1 && n <= 5) energy = n;
    else throw new Error("INVALID_CRITERIA");
  }

  let tags = [];
  if (raw.tags !== undefined && raw.tags !== null) {
    if (!Array.isArray(raw.tags)) throw new Error("INVALID_CRITERIA");
    tags = raw.tags
      .filter((t) => typeof t === "string" && t.trim())
      .map((t) => t.trim().toLowerCase());
  }

  if (!genre && energy === null && tags.length === 0) {
    throw new Error("INVALID_CRITERIA");
  }
  return { genre, energy, tags };
}

module.exports = { validateCriteria };
