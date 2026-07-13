// Single source of truth for difficulty display data — labels and colors
// were previously hardcoded independently in DifficultyChip.astro, search.ts,
// gallery.astro's client script, and creations/index.astro (whose copy had
// silently drifted to different hex values than the others).

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LEVELS: Difficulty[] = ["easy", "medium", "hard"];

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

// A more saturated, solid variant of the .difficulty-* colors in global.css —
// used for small indicators (e.g. the active-filter dot) where the pastel
// chip background would be too low-contrast against white to read as a
// color swatch.
export const DIFFICULTY_DOT_COLORS: Record<string, string> = {
  easy: "#8dc399",
  medium: "#f3c368",
  hard: "#cb8184",
};
