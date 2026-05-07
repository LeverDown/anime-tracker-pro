import apiClient from '@/lib/axios';
import type { BacklogEntry, AnimeStatus, UserPreferences } from '@/types/backlog';

export async function fetchBacklogList(
  status: AnimeStatus = 'PLAN_TO_WATCH'
): Promise<BacklogEntry[]> {
  const { data } = await apiClient.get('/anime/list', {
    params: { status },
  });
  // Map snake_case API response to camelCase TypeScript types
  return data.map((item: any): BacklogEntry => ({
    id:               item.id,
    malId:            item.mal_id,
    title:            item.title,
    episodes:         item.episodes ?? 0,
    watchedEpisodes:  item.watched_episodes ?? 0,
    format:           item.format ?? 'TV',
    genres:           item.genres ?? [],
    coverImage:       item.cover_image ?? null,
    score:            item.score ?? null,
    rank:             item.rank ?? 0,
  }));
}

export async function updateAnimeStatus(
  id: number,
  status: AnimeStatus
): Promise<BacklogEntry> {
  const { data } = await apiClient.patch(`/anime/${id}/status`, { status });
  
  // Return mapped object
  return {
    id:               data.id,
    malId:            data.mal_id,
    title:            data.title,
    episodes:         data.episodes ?? 0,
    watchedEpisodes:  data.watched_episodes ?? 0,
    format:           data.format ?? 'TV',
    genres:           data.genres ?? [],
    coverImage:       data.cover_image ?? null,
    score:            data.score ?? null,
    rank:             data.rank ?? 0,
  };
}

export async function fetchUserPreferences(): Promise<UserPreferences> {
  const { data } = await apiClient.get('/user/preferences');
  return {
    watchRatePerDay: data.watch_rate_per_day ?? 3,
    theme:           data.theme ?? 'NEURAL_DARK',
  };
}

export async function updateUserPreferences(
  prefs: Partial<UserPreferences>
): Promise<void> {
  await apiClient.patch('/user/preferences', {
    watch_rate_per_day: prefs.watchRatePerDay,
    theme:              prefs.theme,
  });
}
