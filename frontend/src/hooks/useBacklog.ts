'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchBacklogList,
  updateAnimeStatus,
  fetchUserPreferences,
  updateUserPreferences,
} from '@/lib/backlogApi';
import type { AnimeStatus, BacklogEntry } from '@/types/backlog';

// ── Fetch plan-to-watch list ──────────────────────────────
export function useBacklogList() {
  return useQuery({
    queryKey: queryKeys.backlog.list('PLAN_TO_WATCH'),
    queryFn:  () => fetchBacklogList('PLAN_TO_WATCH'),
    staleTime: 1000 * 60 * 2,   // 2 minutes
  });
}

// ── Fetch user preferences (watch rate etc.) ─────────────
export function useUserPreferences() {
  return useQuery({
    queryKey: queryKeys.user.preferences(),
    queryFn:  fetchUserPreferences,
    staleTime: 1000 * 60 * 10,
  });
}

// ── Update anime status (START // or INITIALIZE_UPLINK) ──
export function useUpdateAnimeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: AnimeStatus }) =>
      updateAnimeStatus(id, status),

    onMutate: async ({ id, status }) => {
      // Cancel in-flight refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.backlog.list('PLAN_TO_WATCH'),
      });

      // Snapshot previous state for rollback
      const previous = queryClient.getQueryData<BacklogEntry[]>(
        queryKeys.backlog.list('PLAN_TO_WATCH')
      );

      // Optimistic update: remove entry from backlog list immediately
      // (user moved to WATCHING — it's gone from plan-to-watch)
      queryClient.setQueryData<BacklogEntry[]>(
        queryKeys.backlog.list('PLAN_TO_WATCH'),
        (old) => old?.filter((entry) => entry.id !== id) ?? []
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Rollback optimistic update on failure
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.backlog.list('PLAN_TO_WATCH'),
          context.previous
        );
      }
    },

    onSettled: () => {
      // Always refetch after mutation to sync server state
      queryClient.invalidateQueries({
        queryKey: queryKeys.backlog.list('PLAN_TO_WATCH'),
      });
    },
  });
}

// ── Update watch rate preference ──────────────────────────
export function useUpdateWatchRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (watchRatePerDay: number) =>
      updateUserPreferences({ watchRatePerDay }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.preferences(),
      });
    },
  });
}
