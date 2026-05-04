import type { Theme, ThemeCoverSlide, ThemeFlavour } from "@/interface/types/Theme";

export function isHiddenStoreTheme(theme: Theme): boolean {
  return theme.theme_role === "slave";
}

/** Grid and search: omit slave rows (when API sends a flattened list). */
export function visibleStoreThemes(themes: Theme[]): Theme[] {
  return themes.filter((t) => !isHiddenStoreTheme(t));
}

function marqueeOrCoverUrl(t: { marqueeImage?: string; coverImage: string }): string {
  return t.marqueeImage || t.coverImage;
}

/**
 * Builds slides for CoverSwiper: for each top-N master, first master image then each flavour image.
 */
export function buildCoverSlidesForThemes(topThemes: Theme[]): ThemeCoverSlide[] {
  const slides: ThemeCoverSlide[] = [];
  for (const theme of topThemes) {
    const flavours = theme.flavours ?? [];
    if (flavours.length === 0) {
      slides.push({
        imageUrl: marqueeOrCoverUrl(theme),
        title: theme.name,
        subtitle: theme.author ? `By ${theme.author}` : undefined,
        openTheme: theme,
        badgeFeatured: theme.featured === true,
      });
      continue;
    }
    slides.push({
      imageUrl: marqueeOrCoverUrl(theme),
      title: theme.name,
      subtitle: theme.author ? `By ${theme.author}` : undefined,
      openTheme: theme,
      badgeFeatured: theme.featured === true,
    });
    for (const f of flavours) {
      slides.push({
        imageUrl: f.marquee_image || f.cover_image,
        title: theme.name,
        subtitle: f.name,
        openTheme: theme,
        badgeFeatured: theme.featured === true,
      });
    }
  }
  return slides;
}

export type ModalHeroSlide = { imageUrl: string; caption: string };

/** Preview image for carousel + flavour picker (matches hero slide order after master slide). */
export function flavourCarouselImageUrl(f: ThemeFlavour): string {
  const u = (f.marquee_image || f.cover_image || "").trim();
  return u;
}

/** Preview image for master variant tile (modal hero slide 0). */
export function masterCarouselImageUrl(t: Theme): string {
  return (marqueeOrCoverUrl(t) || "").trim();
}

/**
 * Ordered preview URLs for the store grid card rotator: master first, then each variant.
 * Uses nested `flavours` when present; otherwise flat `slave` rows (same order as modal when possible).
 */
export function gridCardPreviewImageUrls(theme: Theme, allStoreRows?: Theme[]): string[] {
  const urls: string[] = [];
  const push = (raw: string) => {
    const u = raw.trim();
    if (u && !urls.includes(u)) urls.push(u);
  };

  push(marqueeOrCoverUrl(theme) || "");

  const flavours = theme.flavours ?? [];
  if (flavours.length > 0) {
    for (const f of flavours) {
      push(flavourCarouselImageUrl(f));
    }
    return urls.length > 0 ? urls : [(theme.coverImage || "").trim()].filter(Boolean);
  }

  if (allStoreRows) {
    const slaves = allStoreRows
      .filter((t) => t.theme_role === "slave" && t.master_id === theme.id)
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const s of slaves) {
      push((marqueeOrCoverUrl(s) || "").trim());
    }
  }

  if (urls.length > 0) return urls;
  const fallback = (theme.coverImage || "").trim();
  return fallback ? [fallback] : [];
}

/**
 * Downloads shown on the grid card for a master row: master's count plus each slave
 * (flat `theme_role === "slave"` with `master_id`) and any flavour-only `download_count`
 * when there is no matching flat slave id (nested-only API shape).
 */
export function masterGridDisplayDownloadCount(master: Theme, allStoreRows: Theme[]): number {
  let total = master.download_count ?? 0;
  const slaveRows = allStoreRows.filter(
    (t) => t.theme_role === "slave" && t.master_id === master.id,
  );
  const countedIds = new Set(slaveRows.map((r) => r.id));
  for (const r of slaveRows) {
    total += r.download_count ?? 0;
  }
  for (const f of master.flavours ?? []) {
    if (countedIds.has(f.id)) continue;
    total += f.download_count ?? 0;
  }
  return total;
}

/** Modal hero: master first, then each flavour (plan order). */
export function buildModalHeroSlides(theme: Theme): ModalHeroSlide[] {
  const slides: ModalHeroSlide[] = [];
  slides.push({
    imageUrl: marqueeOrCoverUrl(theme),
    caption: theme.name,
  });
  const flavours = theme.flavours ?? [];
  for (const f of flavours) {
    slides.push({
      imageUrl: f.marquee_image || f.cover_image,
      caption: `${theme.name} — ${f.name}`,
    });
  }
  return slides;
}

/**
 * Relative luminance 0–1 for rgba/rgb/hex-ish strings; fallback 0.5 → white text
 */
export function pickContrastingTextColor(backgroundCss: string): "#ffffff" | "#0a0a0a" {
  const s = backgroundCss.trim();
  const rgba = s.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (rgba) {
    const r = Number(rgba[1]) / 255;
    const g = Number(rgba[2]) / 255;
    const b = Number(rgba[3]) / 255;
    const a = rgba[4] !== undefined ? Number(rgba[4]) : 1;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const effective = lum * a + 0.05 * (1 - a);
    return effective > 0.45 ? "#0a0a0a" : "#ffffff";
  }
  const hex = s.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (hex) {
    const r = parseInt(hex[1], 16) / 255;
    const g = parseInt(hex[2], 16) / 255;
    const b = parseInt(hex[3], 16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.45 ? "#0a0a0a" : "#ffffff";
  }
  return "#ffffff";
}
