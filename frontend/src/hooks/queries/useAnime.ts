import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { AnimeResult, PageInfo } from "@/types/anime";

// Query Key Factory
export const animeKeys = {
  all: () => ["anime"] as const,
  lists: () => [...animeKeys.all(), "list"] as const,
  list: (filters: any) => [...animeKeys.lists(), { filters }] as const,
  details: (id: number) => [...animeKeys.all(), "detail", id] as const,
  seasonal: (year: number, season: string, page: number) => [...animeKeys.all(), "seasonal", { year, season, page }] as const,
  schedule: (day: string) => [...animeKeys.all(), "schedule", { day }] as const,
  relations: (idMal: number) => [...animeKeys.all(), "relations", idMal] as const,
};

export function useDiscoverAnime(mode: string, query: string, genre: string, page: number, username?: string | null) {
  return useQuery({
    queryKey: animeKeys.list({ mode, query, genre, page, username }),
    queryFn: async () => {
      let endpoint = "/anime/discover";
      const params: any = { page, genre, perPage: 50, mode };
      
      if (mode === "foryou" && username) {
        endpoint = "/anime/recommendations";
        params.username = username;
      } else if (mode === "search") {
        params.query = query;
      }

      const { data } = await api.get(endpoint, { params });
      return data as { data: AnimeResult[]; pageInfo: PageInfo };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAnimeDetails(id: number) {
  return useQuery({
    queryKey: animeKeys.details(id),
    queryFn: async () => {
      const { data } = await api.get(`/anime/details/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSeasonalAnime(year: number, season: string, page: number) {
  return useQuery({
    queryKey: animeKeys.seasonal(year, season, page),
    queryFn: async () => {
      const { data } = await api.get("/anime/seasonal", { params: { year, season, page } });
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useAnimeSchedule(day: string) {
  return useQuery({
    queryKey: animeKeys.schedule(day),
    queryFn: async () => {
      const { data } = await api.get("/anime/schedule", { params: { day } });
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useSmartRelations(idMal: number) {
  return useQuery({
    queryKey: animeKeys.relations(idMal),
    queryFn: async () => {
      const { data } = await api.get('/anime/relations/smart', { params: { idMal } });
      return data.data || [];
    },
    enabled: !!idMal,
  });
}
