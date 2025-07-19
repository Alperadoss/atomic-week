import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";

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
 * OPTIMIZED: Current time hook with proper state management for re-renders
 * Uses state instead of refs to ensure components re-render when time changes
 */
export const useCurrentTime = (intervalMinutes: number = 3) => {
  const [currentTime, setCurrentTime] = useState(() => dayjs());
  const intervalRef = useRef<number | null>(null);

  const updateCurrentTime = useCallback(() => {
    setCurrentTime(dayjs());
  }, []);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      updateCurrentTime();
    }, intervalMinutes * 60 * 1000);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intervalMinutes, updateCurrentTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return currentTime;
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
