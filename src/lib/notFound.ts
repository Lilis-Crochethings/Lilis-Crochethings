import { nameFields, stripDiacritics, type SearchDoc } from "./search";

export type PageSuggestion =
  | SearchDoc
  | { type: "page"; href: string; title: string; image?: undefined };

// The static pages aren't in search-index.json (that only covers
// creations/patterns), but a broken link could still be a typo'd version of
// one of these — worth including as match candidates.
const STATIC_PAGES: PageSuggestion[] = [
  { type: "page", title: "About", href: "/about" },
  { type: "page", title: "Creations", href: "/creations" },
  { type: "page", title: "Gallery", href: "/gallery" },
  { type: "page", title: "Patterns", href: "/patterns" },
  { type: "page", title: "FAQ", href: "/faq" },
  { type: "page", title: "Search", href: "/search" },
  { type: "page", title: "Socials", href: "/socials" },
];

function slugOf(href: string): string {
  const lastSegment = href.replace(/\/+$/, "").split("/").filter(Boolean).pop() ?? "";
  return lastSegment.toLowerCase();
}

// Classic O(n*m) edit distance — inputs here are short URL slugs (a handful
// of hyphenated words), so the naive DP table is plenty fast.
function levenshtein(a: string, b: string): number {
  const dist: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dist[i][0] = i;
  for (let j = 0; j <= b.length; j++) dist[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  return dist[a.length][b.length];
}

function wordsOf(text: string): string[] {
  return stripDiacritics(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Whether two short words are "the same" allowing for simple pluralization
// (pokeball/pokeballs) or a one-character typo — a loose fuzzy bar would
// false-positive constantly on short common words, so this stays strict.
function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  const singularA = a.endsWith("s") ? a.slice(0, -1) : a;
  const singularB = b.endsWith("s") ? b.slice(0, -1) : b;
  if (singularA === singularB) return true;
  return levenshtein(a, b) <= (Math.max(a.length, b.length) >= 6 ? 1 : 0);
}

// Raw character-level slug similarity gets noisy on short slugs: a 4-letter
// target is only 2-3 edits away from almost any other short word, so
// "love" ends up scoring the same 0.4 against "bloom"/"flora"/"goose" as it
// does against the actually-related "lamb-lovey". MIN_SIMILARITY sits above
// that coincidental-overlap band so those false positives get filtered,
// while real word matches (NAME_MATCH_SIMILARITY) and genuine same-length
// typos still clear it.
const MIN_SIMILARITY = 0.45;
const NAME_MATCH_SIMILARITY = 0.65;
const MAX_SUGGESTIONS = 3;

// A page a creation was previously known by (title, type/subtype, tag, or
// search term/nickname) can drift far from its current URL after a rename —
// matching title/tags/types/search terms catches that generally, without a
// hand-maintained old-slug -> new-slug map that would go stale the next time
// something gets renamed.
function nameMatchSimilarity(targetWords: string[], doc: PageSuggestion): number {
  if (doc.type === "page") return 0;
  const nameWords = nameFields(doc).flatMap((name) => wordsOf(name));
  if (!nameWords.length) return 0;
  const hasMatch = targetWords.some((word) => nameWords.some((nameWord) => wordsMatch(word, nameWord)));
  return hasMatch ? NAME_MATCH_SIMILARITY : 0;
}

// Finds pages whose URL slug is close to the missing page's slug (e.g.
// "/creations/buny-laof" -> "/creations/bunny-loaf") or whose tags match a
// word from it (e.g. "/creations/pokeball" -> pages tagged "Pokéball"), so a
// typo'd, outdated, or renamed link can still land the visitor near where
// they meant to go.
export function findSimilarPages(pathname: string, docs: SearchDoc[]): PageSuggestion[] {
  const target = slugOf(pathname);
  if (!target) return [];
  const targetWords = wordsOf(target);

  const candidates: PageSuggestion[] = [...docs, ...STATIC_PAGES];

  return candidates
    .map((candidate) => {
      const candidateSlug = slugOf(candidate.href);
      const distance = levenshtein(target, candidateSlug);
      const slugSimilarity = 1 - distance / Math.max(target.length, candidateSlug.length, 1);
      const similarity = Math.max(slugSimilarity, nameMatchSimilarity(targetWords, candidate));
      return { candidate, similarity };
    })
    .filter(({ similarity }) => similarity >= MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ candidate }) => candidate);
}
