import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { ScheduleResponse, SeasonalResponse } from '../types/schedule';

export const fetchSchedule = async (day: string, timezone: string): Promise<ScheduleResponse> => {
  const res = await api.get(`/anime/schedule?day=${day}&timezone=${encodeURIComponent(timezone)}`);
  return res.data;
};

export const fetchSeasonalIntel = async (year: number, season: string, page: number = 1): Promise<SeasonalResponse> => {
  const res = await api.get(`/anime/seasonal?year=${year}&season=${season}&page=${page}`);
  return res.data;
};

export const useSchedule = (day: string, timezone: string) => {
  return useQuery({
    queryKey: ['schedule', day, timezone],
    queryFn: () => fetchSchedule(day, timezone),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!day,
  });
};

export const useSeasonalIntel = (year: number, season: string, page: number = 1) => {
  return useQuery({
    queryKey: ['seasonal', year, season, page],
    queryFn: () => fetchSeasonalIntel(year, season, page),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
};
