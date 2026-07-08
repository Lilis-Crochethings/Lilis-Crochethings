export type SearchDoc = {
  type: "pattern" | "creation";
  href: string;
  title: string;
  description?: string;
  tags: string[];
  designer?: string;
  patternName?: string;
  image: string;
  difficulty?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escapes a string for safe use inside a RegExp.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// HTML-escapes `text`, then wraps case-insensitive matches of `query` in <mark>.
export function highlight(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const trimmed = query.trim();
  if (!trimmed) return escaped;
  const pattern = new RegExp(escapeRegExp(escapeHtml(trimmed)), "gi");
  return escaped.replace(pattern, (match) => `<mark>${match}</mark>`);
}

export function matchesQuery(doc: SearchDoc, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const haystacks = [doc.title, doc.description, doc.designer, doc.patternName, ...doc.tags];
  return haystacks.some((field) => field?.toLowerCase().includes(q));
}

export function sortResults(docs: SearchDoc[]): SearchDoc[] {
  const typeOrder: Record<SearchDoc["type"], number> = { pattern: 0, creation: 1 };
  return [...docs].sort((a, b) => {
    const typeDiff = typeOrder[a.type] - typeOrder[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.title.localeCompare(b.title);
  });
}

export function search(docs: SearchDoc[], query: string): SearchDoc[] {
  return sortResults(docs.filter((doc) => matchesQuery(doc, query)));
}

const DIFFICULTY_LABELS: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFFICULTY_COLORS: Record<string, string> = { easy: "#8dc399", medium: "#f3c368", hard: "#cb8184" };

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Renders a SearchDoc as the shared ".list-item" tile markup (see global.css),
// with `query` highlighted in the title/description/tags. Used by both the
// navbar's live dropdown and the dedicated /search results page.
export function renderResultTile(doc: SearchDoc, query: string): string {
  const tagsHtml = doc.tags.length
    ? `<div class="tags">${doc.tags.map((tag) => `<span class="tag-chip">${highlight(tag, query)}</span>`).join("")}</div>`
    : "";
  const descriptionHtml = doc.description
    ? `<p class="preview">${highlight(doc.description, query)}</p>`
    : "";
  const difficultyHtml = doc.difficulty
    ? `<span class="difficulty-chip hide-on-mobile" style="color:${DIFFICULTY_COLORS[doc.difficulty] ?? "inherit"}">${DIFFICULTY_LABELS[doc.difficulty] ?? doc.difficulty}</span>`
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
