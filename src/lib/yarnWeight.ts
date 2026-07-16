// Single source of truth for yarn weight (thickness) display labels —
// the standard Craft Yarn Council categories, from thinnest to thickest.
export type YarnWeight =
  | "lace"
  | "super-fine"
  | "fine"
  | "light"
  | "medium"
  | "bulky"
  | "super-bulky"
  | "jumbo";

export const YARN_WEIGHTS: YarnWeight[] = [
  "lace",
  "super-fine",
  "fine",
  "light",
  "medium",
  "bulky",
  "super-bulky",
  "jumbo",
];

export const YARN_WEIGHT_LABELS: Record<string, string> = {
  lace: "Lace",
  "super-fine": "Super Fine",
  fine: "Fine",
  light: "Light",
  medium: "Medium",
  bulky: "Bulky",
  "super-bulky": "Super Bulky",
  jumbo: "Jumbo",
};
