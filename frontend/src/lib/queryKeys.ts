import { AnimeStatus } from '@/types/backlog';

export const queryKeys = {
  backlog: {
    list: (status: AnimeStatus) =>
      ['backlog', 'list', status] as const,
    stats: () => ['backlog', 'stats'] as const,
  },
  user: {
    preferences: () => ['user', 'preferences'] as const,
    profile: (username: string) => ['user', 'profile', username] as const,
    theme: (username: string) => ['user', 'theme', username] as const,
  },
  anime: {
    details: (id: number) => ['anime', 'details', id] as const,
    search: (query: string) => ['anime', 'search', query] as const,
    top: (page: number) => ['anime', 'top', page] as const,
  }
};
