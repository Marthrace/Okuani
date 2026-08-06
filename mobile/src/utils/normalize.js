// Shared normalization helpers. The raw, user-entered value is always kept
// for display ("Kumasi", "Tomatoes") — these produce a separate analytical
// key used only for comparison/search/aggregation, so that casing and
// incidental whitespace differences ("kumasi", "KUMASI ", " Kumasi") never
// create distinct entries in filtering, search, or stock analysis.
//
// Mirrored in simulator/src/utils/normalize.js — keep the two in sync.

function collapseWhitespace(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeLocation(location) {
  return collapseWhitespace(location).toLowerCase();
}

export function normalizeCrop(crop) {
  return collapseWhitespace(crop).toLowerCase();
}

// Best-effort "nice" label for a normalized key when no original-casing
// example is available (e.g. deriving a display heading purely from an
// aggregation key) — title-cases each word. Prefer showing an actual
// listing's raw crop/location text over this whenever one is on hand.
export function titleCase(value) {
  return collapseWhitespace(value)
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}
