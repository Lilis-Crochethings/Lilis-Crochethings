import { renderTagChip, type TagChipData } from "./chips";
import { DIFFICULTY_LABELS } from "./difficulty";
import { escapeAttr, highlight, normalize } from "./text";

export type { TagChipData } from "./chips";
export { escapeHtml, highlight, stripDiacritics } from "./text";

export type SearchDoc = {
  type: "pattern" | "creation";
  href: string;
  title: string;
  description?: string;
  tags: TagChipData[];
  searchTerms?: string[];
  designer?: string;
  patternName?: string;
  image: string;
  difficulty?: string;
};

// A doc's "identity" fields — title, tags, search terms — as opposed to
// free-text fields like the description. A match here means the query is
// about what the piece *is*, not just something it happens to mention, so
// both the search page's ranking and the 404 page's suggestion matching
// treat it as the strongest signal. Kept in one place so a future field
// meant to carry the same weight (e.g. an alternate title) only needs
// adding here.
export function nameFields(doc: SearchDoc): string[] {
  return [doc.title, ...doc.tags.map((tag) => tag.label), ...(doc.searchTerms ?? [])];
}

export function matchesQuery(doc: SearchDoc, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return false;
  const haystacks = [...nameFields(doc), doc.description, doc.designer, doc.patternName];
  return haystacks.some((field) => field && normalize(field).includes(q));
}

// Matches on name fields rank above matches that only show up in the
// description/designer/pattern name — e.g. searching "love" should surface
// "Poképouch - Love Ball" and "Lamb Lovey" (title match) before a creation
// that merely mentions "love" in its description.
function matchTier(doc: SearchDoc, q: string): 0 | 1 {
  return nameFields(doc).some((field) => normalize(field).includes(q)) ? 0 : 1;
}

// Whether `q` is a whole-field match rather than just a substring — e.g.
// searching "cow" should put a creation tagged exactly "Cow" above one that
// merely mentions "cow" inside a longer word/phrase.
function isExactMatch(doc: SearchDoc, q: string): boolean {
  const fields = [...nameFields(doc), doc.designer, doc.patternName];
  return fields.some((field) => field && normalize(field) === q);
}

export function sortResults(docs: SearchDoc[], query: string): SearchDoc[] {
  const q = normalize(query.trim());
  const typeOrder: Record<SearchDoc["type"], number> = { pattern: 0, creation: 1 };
  return [...docs].sort((a, b) => {
    const tierDiff = matchTier(a, q) - matchTier(b, q);
    if (tierDiff !== 0) return tierDiff;
    const exactDiff = Number(isExactMatch(b, q)) - Number(isExactMatch(a, q));
    if (exactDiff !== 0) return exactDiff;
    const typeDiff = typeOrder[a.type] - typeOrder[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.title.localeCompare(b.title);
  });
}

export function search(docs: SearchDoc[], query: string): SearchDoc[] {
  return sortResults(docs.filter((doc) => matchesQuery(doc, query)), query);
}

// Renders a SearchDoc as the shared ".list-item" tile markup (see global.css),
// with `query` highlighted in the title/description/tags. Used by both the
// navbar's live dropdown and the dedicated /search results page.
export function renderResultTile(doc: SearchDoc, query: string): string {
  const tagsHtml = doc.tags.length
    ? `<div class="tags">${doc.tags.map((tag) => renderTagChip(tag, { query })).join("")}</div>`
    : "";
  const descriptionHtml = doc.description
    ? `<p class="preview">${highlight(doc.description, query)}</p>`
    : "";
  // Same "difficulty-chip difficulty-<level>" classes DifficultyChip.astro and
  // gallery.astro's info card use, rather than duplicating global.css's colors
  // as inline styles — this raw HTML string can carry classes just as well.
  const difficultyHtml = doc.difficulty
    ? `<span class="difficulty-chip difficulty-${escapeAttr(doc.difficulty)} hide-on-mobile">${DIFFICULTY_LABELS[doc.difficulty] ?? doc.difficulty}</span>`
    : "";
  return `
    <a class="list-item" href="${escapeAttr(doc.href)}" role="option">
      ${difficultyHtml}
      <div class="thumb"><img src="${escapeAttr(doc.image)}" alt="" loading="lazy" decoding="async" /></div>
      <div class="body">
        <h3 class="title">${highlight(doc.title, query)}</h3>
        ${descriptionHtml}
        ${tagsHtml}
      </div>
    </a>
  `;
}
