export type Season = 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';
export type AnimeStatus = 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED';
export type AnimeFormat = 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL';
export type SortMode = 'SCORE' | 'AIRTIME' | 'POPULARITY';
export type ViewMode = 'GRID' | 'LIST' | 'SCHEDULE';

export interface AiringSchedule {
  airingAt: number;
  episode: number;
}

export interface AnimeTitle {
  romaji: string;
  english?: string | null;
  native?: string | null;
}

export interface CoverImage {
  large: string;
  medium?: string;
  extraLarge?: string;
  color?: string;
}

export interface SeasonalAnimeEntry {
  id: number;
  title: AnimeTitle;
  coverImage: CoverImage;
  averageScore: number | null;
  episodes: number | null;
  nextAiringEpisode: AiringSchedule | null;
  genres: string[];
  status: AnimeStatus;
  format: AnimeFormat;
  popularity: number;
  source_provider?: string;
}
