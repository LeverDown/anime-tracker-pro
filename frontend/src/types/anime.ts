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

export interface AiringData {
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface ExternalLinkData {
  site: string;
  url: string;
  type: string;
  icon?: string | null;
  color?: string | null;
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
  score: number | null | undefined;
  scored_by: number | null | undefined;
  rank: number | null | undefined;
  popularity: number | null | undefined;
  members: number | null | undefined;
  duration: string | null | undefined;
  synopsis: string | null | undefined;
  season: string | null | undefined;
  year: number | null | undefined;
  studios?: { name: string }[];
  genres?: { name: string }[];
  characters?: Character[]; 
  staff?: Staff[];
  relations?: Relation[];
  next_airing?: AiringData | null;
  external_links?: ExternalLinkData[];
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
  username: string;
  anime_id: number;
  title: string;
  image_url: string;
  status: string;
  score: number | null;
  episodes: number | null;
  genres: string;
  review?: string;
  progress: number;
  seasons_json: string;
  series_name?: string;
  coop_friend_username?: string | null;
  drop_reason?: string | null;
}

export interface BacklogMeta {
  total_unwatched_episodes: number;
  estimated_weeks_to_clear: number;
  roulette_pick: { 
    anime_id: number; 
    title: string; 
    image_url: string; 
    episodes: number;
    genres?: string;
  } | null;
}

export interface UserStats {
  total_anime: number;
  total_episodes: number;
  mean_score: number;
  genre_counts: Record<string, number>;
}

export interface Notification {
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PageInfo {
  total: number;
  lastPage: number;
  hasNextPage: boolean;
}

export type AnimeResult = Anime;
