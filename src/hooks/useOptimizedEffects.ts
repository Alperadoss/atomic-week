import dayjs from "dayjs";
import { useCallback, useEffect, useRef } from "react";

/**
 * Optimized hook for managing time calculations with minimal re-renders
 */
export const useTimeCalculation = (
  startTime: Date,
  finishTime: Date,
  setMinutes: (minutes: string) => void
) => {
  const calculateMinutes = useCallback(() => {
    const diffMs = finishTime.getTime() - startTime.getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    return diffMinutes.toString();
  }, [startTime, finishTime]);

  useEffect(() => {
    const minutes = calculateMinutes();
    setMinutes(minutes);
  }, [calculateMinutes, setMinutes]);
};

/**
 * Optimized hook for managing current time updates with minimal re-renders
 */
export const useCurrentTime = (intervalMinutes: number = 3) => {
  const currentTimeRef = useRef(dayjs());

  const updateCurrentTime = useCallback(() => {
    currentTimeRef.current = dayjs();
    return currentTimeRef.current;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      updateCurrentTime();
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes, updateCurrentTime]);

  return currentTimeRef.current;
};

/**
 * Optimized hook for setting default category without cascading re-renders
 */
export const useDefaultCategory = (
  categories: any[],
  selectedCategoryId: number | null,
  setSelectedCategoryId: (id: number | null) => void
) => {
  const hasSetDefault = useRef(false);

  useEffect(() => {
    // Only set default once when categories first load and no category is selected
    if (
      categories.length > 0 &&
      !selectedCategoryId &&
      !hasSetDefault.current
    ) {
      setSelectedCategoryId(categories[0].id);
      hasSetDefault.current = true;
    }
  }, [categories.length > 0, selectedCategoryId === null]); // Simplified dependencies
};

/**
 * Debounced effect hook to prevent rapid re-renders
 */
export const useDebouncedEffect = (
  effect: () => void,
  dependencies: any[],
  delay: number = 100
) => {
  useEffect(() => {
    const timer = setTimeout(effect, delay);
    return () => clearTimeout(timer);
  }, [...dependencies, delay]);
};
