import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { CollectionEntry, UserStats } from "@/types/anime";

export const userKeys = {
  all: () => ["user"] as const,
  profile: (username: string | null) => [...userKeys.all(), "profile", username] as const,
  collection: (username: string | null, filter: string) => [...userKeys.all(), "collection", username, { filter }] as const,
  stats: (username: string | null) => [...userKeys.all(), "stats", username] as const,
};

export function useUserCollection(username: string | null | undefined, filter: string = "All") {
  return useQuery({
    queryKey: userKeys.collection(username ?? null, filter),
    queryFn: async () => {
      const { data } = await api.get("/collection", { params: { username, status_filter: filter } });
      return data.data as CollectionEntry[];
    },
    enabled: !!username,
  });
}

export function useUserProfile(username: string | null | undefined) {
  return useQuery({
    queryKey: userKeys.profile(username ?? null),
    queryFn: async () => {
      const { data } = await api.get(`/profile/${username}`);
      return data;
    },
    enabled: !!username,
  });
}

export function useUserStats(username: string | null | undefined) {
  return useQuery({
    queryKey: userKeys.stats(username ?? null),
    queryFn: async () => {
      const { data } = await api.get(`/user/stats/${username}`);
      return data as UserStats;
    },
    enabled: !!username,
  });
}



export function useSaveToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/collection", data);
      return response.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: userKeys.all() });
      const previousData = queryClient.getQueryData(userKeys.collection(variables.username, "All"));
      
      // We don't have the full anime object to insert optimistically, but we could mock it.
      // For simplicity, we just rollback on error.
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(userKeys.collection(variables.username, "All"), context.previousData);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all() });
      queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/collection/progress", data);
      return response.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: userKeys.all() });
      const previousDataAll = queryClient.getQueryData(userKeys.collection(variables.username, "All"));
      
      // Optimistically update
      const updateData = (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((item: any) =>
          item.anime_id === variables.anime_id
            ? { ...item, progress: variables.episode_progress }
            : item
        );
      };
      
      queryClient.setQueryData(userKeys.collection(variables.username, "All"), updateData);
      // We also should update specific status caches if we knew them, but invalidating handles it
      
      return { previousDataAll };
    },
    onError: (err, variables, context) => {
      if (context?.previousDataAll) {
        queryClient.setQueryData(userKeys.collection(variables.username, "All"), context.previousDataAll);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all() });
      queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
  });
}

export function useUpdateScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/collection/score", data);
      return response.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: userKeys.all() });
      const previousDataAll = queryClient.getQueryData(userKeys.collection(variables.username, "All"));
      
      const updateData = (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((item: any) =>
          item.anime_id === variables.anime_id
            ? { ...item, score: variables.score }
            : item
        );
      };
      
      queryClient.setQueryData(userKeys.collection(variables.username, "All"), updateData);
      
      return { previousDataAll };
    },
    onError: (err, variables, context) => {
      if (context?.previousDataAll) {
        queryClient.setQueryData(userKeys.collection(variables.username, "All"), context.previousDataAll);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all() });
      queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
  });
}

export function useDeleteFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ username, animeId }: { username: string; animeId: number }) => {
      await api.delete("/collection", { params: { username, anime_id: animeId } });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: userKeys.all() });
      const previousDataAll = queryClient.getQueryData(userKeys.collection(variables.username, "All"));
      
      const updateData = (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.filter((item: any) => item.anime_id !== variables.animeId);
      };
      
      queryClient.setQueryData(userKeys.collection(variables.username, "All"), updateData);
      
      return { previousDataAll };
    },
    onError: (err, variables, context) => {
      if (context?.previousDataAll) {
        queryClient.setQueryData(userKeys.collection(variables.username, "All"), context.previousDataAll);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all() });
      queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: any) => {
      const { data } = await api.post("/auth/login", credentials);
      return data;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (credentials: any) => {
      const { data } = await api.post("/auth/register", credentials);
      return data;
    },
  });
}
