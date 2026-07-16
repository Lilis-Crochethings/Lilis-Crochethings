// A visitor's saved yarn overrides for a single pattern — shared by three
// independent client scripts (the pattern detail page's Materials card,
// PatternSettingsCard.astro, and PatternInstructions.astro) so the storage
// key/shape and the change-notification event stay in exactly one place
// instead of being hand-synced across files. Session-only (not
// localStorage): overrides are meant to reset once the visitor leaves, not
// persist as a saved plan.
export type YarnOverride = {
  // Applies to the yarn's swatch/instruction-text color.
  hex?: string;
  // Substitutes for the yarn's own name wherever it's referenced inline in
  // the pattern's info text (e.g. `[body]`) — never a custom label like
  // `[color 1](body)`, and never a line/block's own crochet instruction
  // text (see resolveInfoText() in lib/patternInstructions.ts).
  name?: string;
};

export function overrideStorageKey(slug: string): string {
  return `pattern-yarn-overrides:${slug}`;
}

export function readYarnOverrides(slug: string): Record<string, YarnOverride> {
  try {
    const raw = JSON.parse(sessionStorage.getItem(overrideStorageKey(slug)) ?? "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

// Single choke point for every write — dispatches the same change event the
// other two scripts listen for, so editing a yarn updates the Materials
// card swatch and the pattern instructions' inline yarn color/name live,
// without a reload.
function notifyChange(slug: string): void {
  document.dispatchEvent(new CustomEvent("pattern-yarn-override-change", { detail: { slug } }));
}

export function writeYarnOverrides(slug: string, overrides: Record<string, YarnOverride>): void {
  sessionStorage.setItem(overrideStorageKey(slug), JSON.stringify(overrides));
  notifyChange(slug);
}

export function clearYarnOverrides(slug: string): void {
  sessionStorage.removeItem(overrideStorageKey(slug));
  notifyChange(slug);
}

// Perceived brightness (YIQ formula) — cheap and good enough for a binary
// "is this swatch light enough that a white overlay icon would wash out"
// decision, rather than needing full WCAG contrast math for what's just a
// decorative hint icon, not text.
export function isLightHex(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  return (r * 299 + g * 587 + b * 114) / 1000 > 175;
}
