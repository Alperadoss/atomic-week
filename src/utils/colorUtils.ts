// Memoization cache for hex to rgba conversions
const hexToRgbaCache = new Map<string, string>();

/**
 * Convert hex color to rgba with opacity, with memoization for performance
 */
export const hexToRgba = (hex: string, opacity: number): string => {
  const cacheKey = `${hex}-${opacity}`;

  if (hexToRgbaCache.has(cacheKey)) {
    return hexToRgbaCache.get(cacheKey)!;
  }

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const result = `rgba(${r}, ${g}, ${b}, ${opacity})`;

  hexToRgbaCache.set(cacheKey, result);
  return result;
};

/**
 * Clear the color conversion cache (useful for memory management)
 */
export const clearColorCache = (): void => {
  hexToRgbaCache.clear();
};
