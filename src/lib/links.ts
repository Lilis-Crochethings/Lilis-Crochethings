// A link "leaves the site" only if it points to an absolute http(s) URL —
// site-relative paths ("/about", "/patterns", "#section") always stay in
// the current tab.
export function isExternalLink(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
