// Cover images live at full detail-page resolution (~1600px) directly under
// their collection's folder (public/images/creations/, public/images/patterns/,
// ...). Small tiles (homepage marquee, list/grid views) should use the
// pre-generated small variant in that folder's own thumbs/ subdirectory
// instead — see scripts/generate-thumbnails.mjs.
export function toThumb(imagePath: string): string {
  const lastSlash = imagePath.lastIndexOf("/");
  return `${imagePath.slice(0, lastSlash)}/thumbs/${imagePath.slice(lastSlash + 1)}`;
}
