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
  /** Unix seconds — last server update (GET /api/themes). */
  updated_at?: number;
};
