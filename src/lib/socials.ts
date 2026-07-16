import { parse } from "yaml";
import socialsRaw from "../data/socials.yaml?raw";

export type SocialIcon = { src: string; pad?: number; radius?: string; tinted?: boolean };
export type SocialLink = { name: string; href: string; icon: string; handle?: string };

const { icons, socials, contacts } = parse(socialsRaw) as {
  icons: Record<string, SocialIcon>;
  socials: SocialLink[];
  contacts: SocialLink[];
};

export const socialIcons = icons;

// The linktree "Website" entry points back at the site itself, which
// doesn't belong in a follow-me list.
export const followSocials = socials.filter((s) => s.icon !== "home");

export const contactLinks = contacts;
