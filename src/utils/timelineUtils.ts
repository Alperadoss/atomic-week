import dayjs from "dayjs";

export const HOUR_HEIGHT = 60; // px per hour
export const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
export const TIMELINE_HEIGHT = 24 * HOUR_HEIGHT;

/**
 * Calculate current time position on timeline (memoized)
 */
export const getCurrentTimePosition = (now?: dayjs.Dayjs): number => {
  const currentTime = now || dayjs();
  return (currentTime.hour() * 60 + currentTime.minute()) * MINUTE_HEIGHT;
};

/**
 * Calculate position and height for a record block
 */
export const getRecordPosition = (timestamp: number, minutes: number) => {
  const start = dayjs(timestamp);
  const top = (start.hour() * 60 + start.minute()) * MINUTE_HEIGHT;
  const height = minutes * MINUTE_HEIGHT;
  return { top, height };
};

/**
 * Generate hour labels (0-23) - this can be memoized
 */
export const generateHourLabels = (): Array<{
  hour: number;
  label: string;
}> => {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: dayjs().hour(hour).format("HH:00"),
  }));
};
