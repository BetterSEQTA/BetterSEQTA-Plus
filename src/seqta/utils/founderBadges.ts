import { icon } from "@/lib/icon";
import { Flame, Sparkles, Star, SwatchBook, Trophy } from "lucide-static";
/** Keep in sync with betterseqta-accounts `utils/badges.ts` / `utils/badgeVisuals.ts`. */

export const BADGE_TIERS = [
  {
    key: "founder_10",
    label: "Pioneer",
    threshold: 10,
    rankLabel: "Top 10",
    description: "One of the first 10 people to create a BetterSEQTA Cloud account.",
    base: "#78350f",
    blobs: ["rgba(251,191,36,0.58)", "rgba(234,88,12,0.48)", "rgba(254,243,199,0.42)"],
    icon: "sparkles",
  },
  {
    key: "founder_25",
    label: "Early Adopter",
    threshold: 25,
    rankLabel: "Top 25",
    description: "One of the first 25 people to join BetterSEQTA Cloud.",
    base: "#1e3a8a",
    blobs: ["rgba(79,70,229,0.52)", "rgba(37,99,235,0.46)", "rgba(129,140,248,0.38)"],
    icon: "sparkles",
  },
  {
    key: "founder_50",
    label: "Founding Member",
    threshold: 50,
    rankLabel: "Top 50",
    description: "One of the first 50 Cloud members, early supporter of BetterSEQTA.",
    base: "#0c4a6e",
    blobs: ["rgba(2,132,199,0.5)", "rgba(13,148,136,0.44)", "rgba(56,189,248,0.36)"],
    icon: "star",
  },
  {
    key: "founder_100",
    label: "Centurion",
    threshold: 100,
    rankLabel: "Top 100",
    description: "Among the first 100 BetterSEQTA Cloud accounts ever created.",
    base: "#064e3b",
    blobs: ["rgba(5,150,105,0.5)", "rgba(22,163,74,0.44)", "rgba(52,211,153,0.36)"],
    icon: "star",
  },
  {
    key: "founder_250",
    label: "Quarter Thousand",
    threshold: 250,
    rankLabel: "Top 250",
    description: "One of the first 250 people to sign up for BetterSEQTA Cloud.",
    base: "#7c2d12",
    blobs: ["rgba(217,119,6,0.52)", "rgba(234,88,12,0.46)", "rgba(251,191,36,0.38)"],
    icon: "trophy",
  },
  {
    key: "founder_500",
    label: "Half Thousand",
    threshold: 500,
    rankLabel: "Top 500",
    description: "Among the first 500 BetterSEQTA Cloud members.",
    base: "#7c2d12",
    blobs: ["rgba(234,88,12,0.52)", "rgba(249,115,22,0.46)", "rgba(251,146,60,0.38)"],
    icon: "trophy",
  },
  {
    key: "founder_1000",
    label: "Thousand Club",
    threshold: 1000,
    rankLabel: "Top 1,000",
    description: "One of the first 1,000 BetterSEQTA Cloud accounts.",
    base: "#881337",
    blobs: ["rgba(225,29,72,0.5)", "rgba(219,39,119,0.44)", "rgba(251,113,133,0.36)"],
    icon: "fire",
  },
  {
    key: "founder_2500",
    label: "Founding Cloud",
    threshold: 2500,
    rankLabel: "Top 2,500",
    description: "One of the first 2,500 Cloud members.",
    base: "#713f12",
    blobs: ["rgba(245,158,11,0.52)", "rgba(234,179,8,0.46)", "rgba(252,211,77,0.4)"],
    icon: "fire",
  },
] as const;

export const ACHIEVEMENT_BADGES = [
  {
    key: "theme_submitter",
    label: "Theme Submitter",
    rankLabel: "Community",
    description: "Submitted a custom theme that was accepted into the BetterSEQTA theme gallery.",
    base: "#5b21b6",
    blobs: ["rgba(139,92,246,0.52)", "rgba(124,58,237,0.46)", "rgba(196,181,253,0.4)"],
    icon: "swatch",
  },
] as const;

export type BadgeKey = (typeof BADGE_TIERS)[number]["key"];

export type BadgeItem = {
  key: string;
  label: string;
  awarded_at?: number;
};

type BadgeVisual = {
  key: string;
  label: string;
  rankLabel: string;
  description: string;
  base: string;
  blobs: readonly string[];
  icon: string;
};

const TIER_BY_KEY = new Map(BADGE_TIERS.map((t) => [t.key, t]));
const VISUAL_BY_KEY = new Map<string, BadgeVisual>([
  ...BADGE_TIERS.map((t) => [t.key, t] as const),
  ...ACHIEVEMENT_BADGES.map((b) => [b.key, b] as const),
]);

const UNKNOWN_ACHIEVEMENT_VISUAL = {
  rankLabel: "Achievement",
  description: "Earned on your BetterSEQTA Cloud account.",
  base: "#334155",
  blobs: ["rgba(100,116,139,0.5)", "rgba(71,85,105,0.44)", "rgba(148,163,184,0.38)"],
  icon: "sparkles",
} as const;

function primaryFounderBadge(badges: BadgeItem[], signupNumber?: number | null): BadgeItem | null {
  const fromApi = badges.find((b) => b.key.startsWith("founder_"));
  if (fromApi) return fromApi;

  if (signupNumber != null) {
    const tier = BADGE_TIERS.find((t) => signupNumber <= t.threshold);
    if (!tier) return null;
    return badges.find((b) => b.key === tier.key) ?? { key: tier.key, label: tier.label };
  }

  let best: BadgeItem | null = null;
  let bestThreshold = Infinity;
  for (const badge of badges) {
    const tier = TIER_BY_KEY.get(badge.key as BadgeKey);
    if (tier && tier.threshold < bestThreshold) {
      bestThreshold = tier.threshold;
      best = badge;
    }
  }
  return best;
}

/** Founder pill (at most one) then achievement pills — matches Accounts display rules. */
export function badgesForTitlebar(badges: BadgeItem[], signupNumber?: number | null): BadgeItem[] {
  const founder = primaryFounderBadge(badges, signupNumber);
  const achievements = badges.filter((b) => !b.key.startsWith("founder_"));
  return founder ? [founder, ...achievements] : achievements;
}

export function badgeVisualForKey(key: string, labelFallback = key): BadgeVisual | null {
  const known = VISUAL_BY_KEY.get(key);
  if (known) return known;
  if (key.startsWith("founder_")) return null;
  return { key, label: labelFallback, ...UNKNOWN_ACHIEVEMENT_VISUAL };
}

const BADGE_ICONS: Record<string, string> = {
  sparkles: Sparkles,
  star: Star,
  trophy: Trophy,
  fire: Flame,
  swatch: SwatchBook,
};

function badgeIconSvg(name: string, size = 15): string {
  return icon(BADGE_ICONS[name] ?? Sparkles, { class: "bsplus-founder-badge__icon", size });
}

function badgeBlobStyle(visual: Pick<BadgeVisual, "base" | "blobs">): string {
  return [
    `--badge-base:${visual.base}`,
    `--badge-blob-a:${visual.blobs[0]}`,
    `--badge-blob-b:${visual.blobs[1]}`,
    `--badge-blob-c:${visual.blobs[2]}`,
  ].join(";");
}

export function founderBadgeChipHtml(badge: BadgeItem, options?: { hero?: boolean }): string {
  const visual = badgeVisualForKey(badge.key, badge.label);
  if (!visual) return "";

  const hero = options?.hero ?? false;
  const mods = hero ? " bsplus-founder-badge--hero" : "";
  const icon = badgeIconSvg(visual.icon, hero ? 20 : 15);

  return `<button type="button" class="bsplus-founder-badge${mods}" data-tier="${badge.key}" style="${badgeBlobStyle(visual)}"><span class="bsplus-founder-badge__glass"><span class="bsplus-founder-badge__blobs" aria-hidden="true"></span><span class="bsplus-founder-badge__content">${icon}<span class="bsplus-founder-badge__label">${badge.label || visual.label}</span></span></span></button>`;
}

export { badgeBlobStyle };
