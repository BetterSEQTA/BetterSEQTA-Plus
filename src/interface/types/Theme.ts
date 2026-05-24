export type ThemeRole = "standard" | "master" | "slave";

/** List/detail metadata for variants of a master theme (full theme.json fetched at install by id). */
export type ThemeFlavour = {
  id: string;
  name: string;
  /** Mirrors theme.json accent (e.g. defaultColour); used for install picker buttons */
  accent_color: string;
  cover_image: string;
  marquee_image?: string;
  /** Per-variant installs when slaves are not returned as flat `theme_role` rows */
  download_count?: number;
};

export type Theme = {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  marqueeImage?: string;
  theme_json_url?: string;
  is_favorited?: boolean;
  favorite_count?: number;
  download_count?: number;
  author?: string;
  featured?: boolean;
  tags?: string[];
  /** Unix time in seconds (API list/detail). */
  created_at?: number;
  /** Unix seconds — last server update (GET /api/themes). */
  updated_at?: number;
  /** Omitted / `standard` — show in grid. `slave` hides from grid. `master` can list `flavours`. */
  theme_role?: ThemeRole;
  /** Present when `theme_role === "slave"` and API returns a flat list during migration */
  master_id?: string;
  /** Variants nested on master rows; installs use flavour `id` */
  flavours?: ThemeFlavour[];
};

/** One marquee slide (cover hero or modal carousel). */
export type ThemeCoverSlide = {
  imageUrl: string;
  /** Main line — usually master name */
  title: string;
  /** Subline — flavour name when applicable */
  subtitle?: string;
  /** Opening the modal uses this theme (always the grid row / master object) */
  openTheme: Theme;
  badgeFeatured?: boolean;
};
