// Descriptions in creation YAML files can reference other pages or sources
// inline using markdown-style link syntax: [visible text](url). This keeps
// the raw URL out of the prose while still being easy to type in a text
// editor. Renders differ by context: the full detail page can show real
// clickable links, while truncated previews (list rows, gallery info card)
// just want the plain label without the syntax.

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

export function stripDescriptionLinks(text: string): string {
  return text.replace(LINK_RE, "$1");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function descriptionToHtml(text: string): string {
  let html = "";
  let lastIndex = 0;

  for (const match of text.matchAll(LINK_RE)) {
    const [full, label, url] = match;
    html += escapeHtml(text.slice(lastIndex, match.index));
    const isExternal = /^https?:\/\//.test(url);
    const attrs = isExternal ? ` target="_blank" rel="noopener noreferrer"` : "";
    html += `<a href="${escapeHtml(url)}"${attrs}>${escapeHtml(label)}</a>`;
    lastIndex = match.index! + full.length;
  }
  html += escapeHtml(text.slice(lastIndex));

  return html;
}
