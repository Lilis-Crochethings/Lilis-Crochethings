import { escapeHtml, highlight } from "./search";
import { isExternalLink } from "./links";

export type FaqVideo = { url: string; title: string; creator?: string };
// Generic named link — icon credits, product recommendations, anything
// that's just "here's a thing, here's its name, here's where it links to".
// icon is optional so plain text links (no artwork to show) can use the same
// shape as icon credits.
export type FaqLink = { icon?: string; name: string; link: string };
export type FaqQuestion = {
  question: string;
  answer: string;
  videos?: FaqVideo[];
  links?: FaqLink[];
};
export type FaqCategory = { id: string; title: string; questions: FaqQuestion[] };

export function getFaqQuestionId(categoryId: string, index: number): string {
  return `faq-q-${categoryId}-${index}`;
}

export type FaqDoc = {
  id: string;
  href: string;
  category: string;
  question: string;
  answer: string;
};

// Supports a small subset of markdown in FAQ answers: `[text](url)` inline
// links, plus blank-line-separated paragraphs where a paragraph whose every
// line starts with "- " renders as a bullet list instead of running text —
// e.g. a round-by-round style answer ("- 8 inc (16)" / "- (1 sc, 1 inc) x8
// (24)"). In the yaml source, list lines need extra indentation (beyond the
// answer's base indent) so YAML's ">" folded scalar keeps them on separate
// lines instead of joining them into running text — see faq.yaml's
// "cone-shaped" answer for an example.
// Pass `query` to also wrap case-insensitive matches in <mark> (both in link text and plain text).
export function renderFaqAnswer(answer: string, query = ""): string {
  return answer
    .trim()
    .split(/\n{2,}/)
    .map((block) => renderFaqBlock(block, query))
    .join("");
}

function renderFaqBlock(block: string, query: string): string {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const isList = lines.length > 0 && lines.every((line) => line.startsWith("- "));

  if (isList) {
    return `<ul>${lines.map((line) => `<li>${renderFaqInline(line.slice(2), query)}</li>`).join("")}</ul>`;
  }
  return `<p>${renderFaqInline(lines.join(" "), query)}</p>`;
}

function renderFaqInline(text: string, query: string): string {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text))) {
    result += highlight(text.slice(lastIndex, match.index), query);
    const [full, linkText, url] = match;
    const attrs = isExternalLink(url) ? ' target="_blank" rel="noopener noreferrer"' : "";
    result += `<a href="${escapeHtml(url)}"${attrs}>${highlight(linkText, query)}</a>`;
    lastIndex = match.index + full.length;
  }
  result += highlight(text.slice(lastIndex), query);

  return result;
}

export function matchesFaqQuery(doc: FaqDoc, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return doc.question.toLowerCase().includes(q) || doc.answer.toLowerCase().includes(q);
}

export function searchFaq(docs: FaqDoc[], query: string): FaqDoc[] {
  return docs.filter((doc) => matchesFaqQuery(doc, query)).sort((a, b) => a.question.localeCompare(b.question));
}

// Renders a FaqDoc as the shared ".faq-result-card" markup (see global.css),
// with `query` highlighted. Used by both the navbar's live dropdown and the
// dedicated /search results page.
//
// This is NOT an <a> — the answer can itself contain a real <a> (via
// renderFaqAnswer's markdown-link support), and nested anchors are invalid
// HTML (the browser silently closes the outer one early, breaking the card's
// box exactly at the inner link). Instead it's a clickable div; see
// bindFaqResultCardClicks for the navigation behavior.
export function renderFaqResultTile(doc: FaqDoc, query: string): string {
  return `
    <div class="faq-result-card" data-href="${escapeHtml(doc.href)}" role="link" tabindex="0">
      <p class="faq-result-question">${highlight(doc.question, query)}</p>
      <div class="faq-result-answer">${renderFaqAnswer(doc.answer, query)}</div>
    </div>
  `;
}

// Makes .faq-result-card elements inside `container` navigate to their
// data-href on click/Enter/Space, unless the click landed on a real inner
// <a> (e.g. a link inside the answer text), which should navigate itself.
export function bindFaqResultCardClicks(container: HTMLElement): void {
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("a")) return;
    const card = target.closest<HTMLElement>(".faq-result-card");
    if (card?.dataset.href) window.location.href = card.dataset.href;
  });

  container.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const target = e.target as HTMLElement;
    const card = target.closest<HTMLElement>(".faq-result-card");
    if (!card?.dataset.href) return;
    e.preventDefault();
    window.location.href = card.dataset.href;
  });
}
