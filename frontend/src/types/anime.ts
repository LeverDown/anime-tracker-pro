/**
 * RDS_ANIME_SCHEMA
 * Discriminated unions and strict null guards for AniList/Jikan API fields.
 */

export interface AnimeImage {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

export interface AnimeImages {
  jpg: AnimeImage;
  webp: AnimeImage;
}

export interface Anime {
  mal_id: number;
  url: string;
  images: AnimeImages;
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  source?: string;
  episodes?: number;
  status: string;
  airing: boolean;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  synopsis: string | null;
  season: string | null;
  year: number | null;
  studios?: { name: string }[];
  genres?: { name: string }[];
  characters?: Character[]; 
  staff?: Staff[];
  relations?: Relation[];
}

export interface Character {
  character: {
    mal_id: number;
    name: string;
    images: AnimeImages;
  };
  role: string;
  voice_actors: {
    person: {
      name: string;
      images: AnimeImages;
    };
    language: string;
  }[];
}

export interface Staff {
  person: {
    name: string;
    images: AnimeImages;
  };
  positions: string[];
}

export interface Relation {
  relation: string;
  entry: {
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }[];
}

export interface CollectionEntry {
  anime_id: number;
  title: string;
  image_url: string;
  status: string;
  score: number | null;
  episodes: number | null;
  genres?: string;
}

export interface BacklogMeta {
  total_unwatched_episodes: number;
  estimated_weeks_to_clear: number;
  roulette_pick: { 
    anime_id: number; 
    title: string; 
    image_url: string; 
    episodes: number 
  } | null;
}

export interface Notification {
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SeasonalResponse {
  data: Anime[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
  };
}
