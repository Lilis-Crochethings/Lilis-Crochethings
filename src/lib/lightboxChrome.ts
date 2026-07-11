// Shared open/close/keyboard/scroll-lock wiring for the <LightboxChrome> +
// <LightboxStage> components — used by both the creation detail page's
// photo lightbox and the gallery page's modal. Wraps initLightboxNav (the
// prev/next/swipe/slide logic) with the backdrop chrome behavior around it:
// only the true backdrop (not the slotted content — image, nav buttons, an
// optional info card) closes on click; Escape closes; arrow keys navigate;
// the body is scroll-locked while open (position:fixed, restored on close —
// plain overflow:hidden alone doesn't reliably block iOS Safari's
// touch-driven scroll-through).
//
// The stop-propagation guard lives on the individual content boxes (the
// image stage, the optional info card) rather than on their shared .lb-inner
// wrapper — .lb-inner is the flex row that lays them out side by side, so
// its own box also covers the gap between them. Guarding the whole wrapper
// would swallow clicks that land in that gap (still visually backdrop) and
// stop them from closing the modal.
import { initLightboxNav, type LightboxItem, type LightboxNavController } from "./lightboxNav";

export interface LightboxChromeRefs {
  overlay: HTMLElement;
  frame: HTMLElement;
  img: HTMLImageElement;
  items: LightboxItem[];
  freezeFrameSize?: boolean;
  onChange?: (index: number) => void;
}

export interface LightboxChromeController {
  open: (index: number) => void;
  close: () => void;
  nav: LightboxNavController;
}

export function initLightboxChrome(refs: LightboxChromeRefs): LightboxChromeController {
  const closeBtn = refs.overlay.querySelector<HTMLElement>(".lb-close");
  const stage = refs.overlay.querySelector<HTMLElement>(".lb-stage")!;
  const infoCard = refs.overlay.querySelector<HTMLElement>(".info-card");
  const prevBtn = refs.overlay.querySelector<HTMLElement>(".lb-prev");
  const nextBtn = refs.overlay.querySelector<HTMLElement>(".lb-next");

  if (refs.items.length <= 1) {
    prevBtn?.classList.add("hidden");
    nextBtn?.classList.add("hidden");
  }

  const nav = initLightboxNav({
    swipeTarget: refs.overlay,
    stage,
    frame: refs.frame,
    img: refs.img,
    prevBtn,
    nextBtn,
    items: refs.items,
    freezeFrameSize: refs.freezeFrameSize,
    onChange: refs.onChange,
  });

  let savedScrollY = 0;

  function open(index: number) {
    nav.show(index);
    refs.overlay.classList.add("open");
    document.body.classList.add("nav-open");
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = "100%";
  }

  function close() {
    refs.overlay.classList.remove("open");
    document.body.classList.remove("nav-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, savedScrollY);
  }

  refs.overlay.addEventListener("click", close);
  stage.addEventListener("click", (e) => e.stopPropagation());
  infoCard?.addEventListener("click", (e) => e.stopPropagation());
  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });

  document.addEventListener("keydown", (e) => {
    if (!refs.overlay.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") nav.prev();
    if (e.key === "ArrowRight") nav.next();
  });

  return { open, close, nav };
}
