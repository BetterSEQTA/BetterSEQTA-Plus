/** Founder badge tiers — keep in sync with betterseqta-accounts/utils/badges.ts */

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
    description: "One of the first 50 Cloud members — an early supporter of BetterSEQTA.",
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
    description: "One of the first 2,500 Cloud members — part of the founding generation of BetterSEQTA Cloud.",
    base: "#713f12",
    blobs: ["rgba(245,158,11,0.52)", "rgba(234,179,8,0.46)", "rgba(252,211,77,0.4)"],
    icon: "fire",
  },
] as const;

export type BadgeKey = (typeof BADGE_TIERS)[number]["key"];

export type FounderBadgeItem = {
  key: string;
  label: string;
  awarded_at?: number;
};

const TIER_BY_KEY = new Map(BADGE_TIERS.map((t) => [t.key, t]));

export function tierForBadgeKey(key: string) {
  return TIER_BY_KEY.get(key as BadgeKey);
}

export function primaryFounderBadgeKey(signupNumber: number): BadgeKey | null {
  const tier = BADGE_TIERS.find((t) => signupNumber <= t.threshold);
  return tier?.key ?? null;
}

export function pickPrimaryFounderBadge(
  badges: FounderBadgeItem[],
  signupNumber?: number | null,
): FounderBadgeItem | null {
  if (signupNumber != null) {
    const key = primaryFounderBadgeKey(signupNumber);
    if (!key) return null;
    return badges.find((b) => b.key === key) ?? { key, label: TIER_BY_KEY.get(key)?.label ?? key };
  }

  if (badges.length === 0) return null;

  let best: FounderBadgeItem | null = null;
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

const ICON_PATHS: Record<string, string> = {
  sparkles:
    "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
  star: "M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005z",
  trophy:
    "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.726 6.726 0 01-3.128 0m3.128 0a6.726 6.726 0 01-3.128 0",
  fire: "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48zM12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z",
};

export function badgeIconSvg(icon: string, size = 15): string {
  const path = ICON_PATHS[icon] ?? ICON_PATHS.sparkles;
  return `<svg class="bsplus-founder-badge__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}" aria-hidden="true"><path d="${path}"/></svg>`;
}

export function tierBlobStyle(tier: (typeof BADGE_TIERS)[number]): string {
  return [
    `--badge-base:${tier.base}`,
    `--badge-blob-a:${tier.blobs[0]}`,
    `--badge-blob-b:${tier.blobs[1]}`,
    `--badge-blob-c:${tier.blobs[2]}`,
  ].join(";");
}

export function founderBadgeChipHtml(
  badge: FounderBadgeItem,
  options?: { hero?: boolean; titlebar?: boolean },
): string {
  const tier = tierForBadgeKey(badge.key);
  if (!tier) return "";

  const hero = options?.hero ?? false;
  const titlebar = options?.titlebar ?? false;
  const mods = `${hero ? " bsplus-founder-badge--hero" : ""}${titlebar ? " bsplus-founder-badge--titlebar" : ""}`;
  const icon = titlebar ? "" : badgeIconSvg(tier.icon, hero ? 20 : 15);

  return `<button type="button" class="bsplus-founder-badge${mods}" data-tier="${badge.key}" style="${tierBlobStyle(tier)}"><span class="bsplus-founder-badge__glass"><span class="bsplus-founder-badge__blobs" aria-hidden="true"></span><span class="bsplus-founder-badge__content">${icon}<span class="bsplus-founder-badge__label">${badge.label}</span></span></span></button>`;
}
