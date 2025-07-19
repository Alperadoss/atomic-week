/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // Dark mode has been removed for web as well. Always use light scheme.
  return "light";
}
