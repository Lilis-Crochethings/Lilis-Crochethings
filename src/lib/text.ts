// Small text primitives shared by the search/chip/404-suggestion logic —
// kept dependency-free (no SearchDoc, no chip markup) so search.ts and
// chips.ts can both depend on this without a circular import between them.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Strips combining diacritical marks (the accents Unicode NFD splits off of
// letters like é/è) so "pokemon" still matches "Pokémon" — accented and
// unaccented spellings should be treated as the same search term throughout.
export function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalize(text: string): string {
  return stripDiacritics(text).toLowerCase();
}

// HTML-escapes `text`, then wraps matches of `query` in <mark>, ignoring case
// and accents (e.g. querying "pokemon" highlights "Pokémon"). Matching is
// done on the raw text first — stripping diacritics doesn't change character
// count for the accents used on this site, so indices line up — then each
// slice is escaped individually so escaping never shifts those indices.
export function highlight(text: string, query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return escapeHtml(text);

  const normalizedText = normalize(text);
  const normalizedQuery = normalize(trimmed);
  if (!normalizedQuery || normalizedText.length !== text.length) return escapeHtml(text);

  let result = "";
  let i = 0;
  while (i < text.length) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, i);
    if (matchIndex === -1) {
      result += escapeHtml(text.slice(i));
      break;
    }
    const matchEnd = matchIndex + normalizedQuery.length;
    result += escapeHtml(text.slice(i, matchIndex));
    result += `<mark>${escapeHtml(text.slice(matchIndex, matchEnd))}</mark>`;
    i = matchEnd;
  }
  return result;
}
