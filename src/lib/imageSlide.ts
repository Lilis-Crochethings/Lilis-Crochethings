// Shared "push" slide transition for swapping one image for another inside
// an overflow:hidden viewport — the outgoing image slides out one side while
// the incoming image slides in from the other, instead of an instant swap.
// Used by both the creation-tile carousels and the gallery lightbox.

export const SLIDE_MS = 280;

export async function slideImage(
  viewport: HTMLElement,
  outgoing: HTMLImageElement,
  newSrc: string,
  newAlt: string,
  direction: 1 | -1,
  onSettled: (incoming: HTMLImageElement) => void,
): Promise<void> {
  const incoming = outgoing.cloneNode() as HTMLImageElement;
  // The gallery modal shows the full-size image, not the thumbnail the grid
  // already had loaded — on a real network (unlike local dev, where it's
  // instant) an unvisited image can still be blank partway through, or all
  // the way through, the slide, only popping in once the fetch finishes.
  // loading="lazy" (copied from outgoing by cloneNode) only adds more
  // uncertainty about when that fetch even starts, for an image that's
  // about to be shown immediately — drop it, and wait for a decoded frame
  // to actually be ready before this becomes part of the animation at all.
  incoming.removeAttribute("loading");
  incoming.src = newSrc;
  incoming.alt = newAlt;

  try {
    await incoming.decode();
  } catch {
    // decode() rejects if the image errors out (or gets swapped again
    // before it finishes) — animate whatever it's got rather than leaving
    // the UI stuck waiting on an image that's never coming.
  }

  Object.assign(incoming.style, {
    position: "absolute",
    inset: "0",
    transform: `translateX(${direction * 100}%)`,
    transition: "none",
  });
  outgoing.style.position = "absolute";
  outgoing.style.inset = "0";
  viewport.appendChild(incoming);

  // Commit the starting transform above before switching to the animated
  // end state below, or the browser collapses both into a single frame and
  // the "incoming" image never visibly starts off to the side.
  incoming.getBoundingClientRect();

  outgoing.style.transition = `transform ${SLIDE_MS}ms ease`;
  incoming.style.transition = `transform ${SLIDE_MS}ms ease`;
  outgoing.style.transform = `translateX(${-direction * 100}%)`;
  incoming.style.transform = "translateX(0)";

  incoming.addEventListener(
    "transitionend",
    () => {
      outgoing.remove();
      incoming.style.position = "";
      incoming.style.inset = "";
      incoming.style.transform = "";
      incoming.style.transition = "";
      onSettled(incoming);
    },
    { once: true },
  );
}
