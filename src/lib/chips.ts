import { escapeAttr, escapeHtml, highlight } from "./text";

export type ChipSize = "default" | "small";

export type TagChipData = {
  label: string;
  icon?: string;
  color?: string;
};

// Builds the ".tag-chip" pill markup shared by every tag list on the site —
// creation/pattern tiles, the detail page, the navbar/search-page results,
// the gallery lightbox, and the 404 page's "did you mean" cards. Returned as
// an HTML string (not an Astro component) so client-side scripts that render
// tags from fetched JSON (search, gallery) can use the exact same markup as
// server-rendered pages, instead of keeping a second copy in sync by hand.
export function renderTagChip(
  tag: TagChipData,
  options: { size?: ChipSize; query?: string; extraClass?: string } = {}
): string {
  const { size = "default", query, extraClass } = options;
  const classes = ["tag-chip", size === "small" && "tag-chip-small", extraClass].filter(Boolean).join(" ");
  const iconHtml = tag.icon
    ? `<span class="tag-chip-icon mask-icon" style="background-color:${escapeAttr(tag.color ?? "var(--primary)")};mask-image:url(${escapeAttr(tag.icon)});-webkit-mask-image:url(${escapeAttr(tag.icon)});"></span>`
    : "";
  const labelHtml = query !== undefined ? highlight(tag.label, query) : escapeHtml(tag.label);
  return `<span class="${classes}">${iconHtml}${labelHtml}</span>`;
}
