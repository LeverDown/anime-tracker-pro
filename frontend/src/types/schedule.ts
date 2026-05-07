export interface AiringEntry {
  id: number;
  id_mal?: number;
  title_romaji: string;
  title_english?: string;
  cover_image: string;
  airing_at: number;
  episode: number;
  source: 'anilist' | 'jikan';
  episodes?: number;
  average_score?: number;
  genres?: string[];
  description?: string;
  status?: string;
  format?: string;
}

export interface ScheduleMeta {
  day: string;
  timezone: string;
  source: string;
  cached: boolean;
}

export interface ScheduleResponse {
  data: AiringEntry[];
  meta: ScheduleMeta;
}

export interface SeasonalEntry extends AiringEntry {
  // All fields are now in AiringEntry as optional
}

export interface SeasonalResponse {
  data: SeasonalEntry[];
  page: number;
  has_next: boolean;
  source: string;
}
