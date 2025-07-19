import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteRecord,
  fetchTodayRecords,
  getCategories,
  getRecordsByDateRange,
  insertRecord,
  updateRecord,
} from "../db";

// Query keys for React Query caching
export const QUERY_KEYS = {
  CATEGORIES: ["categories"],
  TODAY_RECORDS: ["records", "today"],
  WEEK_RECORDS: (weekStart: number) => ["records", "week", weekStart],
  WEEK_STATS: (weekStart: number) => ["stats", "week", weekStart],
} as const;

/**
 * Hook to fetch categories with caching
 */
export const useCategories = () => {
  return useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
  });
};

/**
 * Hook to fetch today's records with caching
 */
export const useTodayRecords = () => {
  return useQuery({
    queryKey: QUERY_KEYS.TODAY_RECORDS,
    queryFn: () => fetchTodayRecords(new Date()),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch week records with caching
 */
export const useWeekRecords = (weekStart: number, weekEnd: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.WEEK_RECORDS(weekStart),
    queryFn: () => getRecordsByDateRange(weekStart, weekEnd),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch week statistics data with caching
 * This combines records and categories for statistics calculations
 */
export const useWeekStatistics = (weekStart: number, weekEnd: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.WEEK_STATS(weekStart),
    queryFn: async () => {
      const [records, categories] = await Promise.all([
        getRecordsByDateRange(weekStart, weekEnd),
        getCategories(),
      ]);
      return { records, categories };
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - statistics can be slightly staler
    gcTime: 20 * 60 * 1000, // 20 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to insert a new record with cache invalidation
 */
export const useInsertRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: insertRecord,
    onSuccess: () => {
      // Invalidate related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_RECORDS });
      queryClient.invalidateQueries({ queryKey: ["records", "week"] });
      queryClient.invalidateQueries({ queryKey: ["stats", "week"] });
    },
  });
};

/**
 * Hook to update a record with cache invalidation
 */
export const useUpdateRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      categoryId,
      description,
      minutes,
      timestamp,
    }: {
      id: number;
      categoryId?: number | null;
      description?: string | null;
      minutes?: number;
      timestamp?: number;
    }) => updateRecord(id, categoryId, description, minutes, timestamp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_RECORDS });
      queryClient.invalidateQueries({ queryKey: ["records", "week"] });
      queryClient.invalidateQueries({ queryKey: ["stats", "week"] });
    },
  });
};

/**
 * Hook to delete a record with cache invalidation
 */
export const useDeleteRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TODAY_RECORDS });
      queryClient.invalidateQueries({ queryKey: ["records", "week"] });
      queryClient.invalidateQueries({ queryKey: ["stats", "week"] });
    },
  });
};
