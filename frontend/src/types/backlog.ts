export type AnimeStatus =
  | 'WATCHING'
  | 'COMPLETED'
  | 'PLAN_TO_WATCH'
  | 'DROPPED'
  | 'PAUSED';

export type AnimeFormat = 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL';

export type SortMode =
  | 'PRIORITY'
  | 'EPS_ASC'
  | 'EPS_DESC'
  | 'ALPHABETICAL';

export interface BacklogEntry {
  id: number;
  malId: number;
  title: string;
  episodes: number;
  watchedEpisodes: number;
  format: AnimeFormat;
  genres: string[];
  coverImage: string | null;
  score: number | null;
  rank: number;
}

export interface UserPreferences {
  watchRatePerDay: number;
  theme: string;
}

export interface BacklogStats {
  nodeCount: number;
  totalEpisodes: number;
  totalWeeks: number;
  solarYears: number;
  avgDaysPerSeries: number;
  nextNode: BacklogEntry | null;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RouletteState {
  isSpinning: boolean;
  result: BacklogEntry | null;
  diceFace: string;
  intervalId: ReturnType<typeof setInterval> | null;
}
