import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { initializeDatabase } from "@/src/db";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Optimized React Query client configuration for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale-while-revalidate strategy
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      retry: 1, // Reduce retries for mobile performance
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: "always", // Always refetch on component mount
    },
    mutations: {
      retry: 1, // Reduce mutation retries
    },
  },
});

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Initialize database on app start
  useEffect(() => {
    try {
      initializeDatabase();
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
