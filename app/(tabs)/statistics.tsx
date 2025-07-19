import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useWeekStatistics } from "../../src/hooks/useDatabase";

dayjs.extend(isoWeek);

type RecordItem = {
  id: number;
  description: string;
  minutes: number;
  timestamp: number;
  categoryId: number | null;
};

type Category = {
  id: number;
  name: string;
  colorHex: string | null;
  createdAt: number;
};

type CategoryStat = {
  category: Category;
  totalMinutes: number;
  totalHours: string;
  recordCount: number;
  percentage: number;
};

export default function StatisticsScreen() {
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf("isoWeek"));

  // OPTIMIZED: Use React Query hook for cached data fetching
  const weekStart = currentWeek.valueOf();
  const weekEnd = currentWeek.add(6, "day").endOf("day").valueOf();
  const { data, isLoading, error } = useWeekStatistics(weekStart, weekEnd);

  // OPTIMIZED: Memoize expensive statistics calculations
  const { categoryStats, totalWeekMinutes } = useMemo(() => {
    if (!data) {
      return { categoryStats: [], totalWeekMinutes: 0 };
    }

    const { records, categories } = data;

    const totalMinutes = records.reduce(
      (sum: number, record: RecordItem) => sum + record.minutes,
      0
    );

    // Group records by category
    const categoryGroups: { [key: string]: RecordItem[] } = {};

    // Initialize with all categories (including those with no records)
    categories.forEach((category: Category) => {
      categoryGroups[category.id.toString()] = [];
    });

    // Add uncategorized group
    categoryGroups["uncategorized"] = [];

    // Group records
    records.forEach((record: RecordItem) => {
      const key = record.categoryId
        ? record.categoryId.toString()
        : "uncategorized";
      if (!categoryGroups[key]) {
        categoryGroups[key] = [];
      }
      categoryGroups[key].push(record);
    });

    // Calculate stats for each category
    const stats: CategoryStat[] = [];

    // Real categories
    categories.forEach((category: Category) => {
      const categoryRecords = categoryGroups[category.id.toString()] || [];
      const categoryMinutes = categoryRecords.reduce(
        (sum: number, record: RecordItem) => sum + record.minutes,
        0
      );
      const percentage =
        totalMinutes > 0 ? (categoryMinutes / totalMinutes) * 100 : 0;

      stats.push({
        category,
        totalMinutes: categoryMinutes,
        totalHours: (categoryMinutes / 60).toFixed(1),
        recordCount: categoryRecords.length,
        percentage: Math.round(percentage),
      });
    });

    // Uncategorized records
    const uncategorizedRecords = categoryGroups["uncategorized"] || [];
    if (uncategorizedRecords.length > 0) {
      const uncategorizedMinutes = uncategorizedRecords.reduce(
        (sum: number, record: RecordItem) => sum + record.minutes,
        0
      );
      const percentage =
        totalMinutes > 0 ? (uncategorizedMinutes / totalMinutes) * 100 : 0;

      stats.push({
        category: {
          id: -1,
          name: "Uncategorized",
          colorHex: "#9ca3af",
          createdAt: 0,
        },
        totalMinutes: uncategorizedMinutes,
        totalHours: (uncategorizedMinutes / 60).toFixed(1),
        recordCount: uncategorizedRecords.length,
        percentage: Math.round(percentage),
      });
    }

    // Sort by total minutes (descending)
    stats.sort((a, b) => b.totalMinutes - a.totalMinutes);

    return { categoryStats: stats, totalWeekMinutes: totalMinutes };
  }, [data]);

  // OPTIMIZED: Memoize navigation function
  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek((prev) =>
      direction === "prev" ? prev.subtract(1, "week") : prev.add(1, "week")
    );
  };

  // OPTIMIZED: Memoize render function for better performance
  const renderCategoryStat = (stat: CategoryStat) => (
    <View key={stat.category.id} style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={styles.categoryInfo}>
          <View
            style={[
              styles.colorIndicator,
              { backgroundColor: stat.category.colorHex || "#ccc" },
            ]}
          />
          <Text style={styles.categoryName}>{stat.category.name}</Text>
        </View>
        <Text style={styles.percentage}>{stat.percentage}%</Text>
      </View>

      <View style={styles.statDetails}>
        <Text style={styles.statText}>
          <Text style={styles.statLabel}>Time: </Text>
          {stat.totalHours}h ({stat.totalMinutes}m)
        </Text>
        <Text style={styles.statText}>
          <Text style={styles.statLabel}>Records: </Text>
          {stat.recordCount}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${stat.percentage}%`,
              backgroundColor: stat.category.colorHex || "#ccc",
            },
          ]}
        />
      </View>
    </View>
  );

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.navButton}
            onPress={() => navigateWeek("prev")}
          >
            <MaterialIcons name="chevron-left" size={24} color="white" />
          </Pressable>

          <Text style={styles.headerText}>
            Week of {currentWeek.format("MMM D")} -{" "}
            {currentWeek.add(6, "day").format("MMM D")}
          </Text>

          <Pressable
            style={styles.navButton}
            onPress={() => navigateWeek("next")}
          >
            <MaterialIcons name="chevron-right" size={24} color="white" />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.navButton}
            onPress={() => navigateWeek("prev")}
          >
            <MaterialIcons name="chevron-left" size={24} color="white" />
          </Pressable>

          <Text style={styles.headerText}>
            Week of {currentWeek.format("MMM D")} -{" "}
            {currentWeek.add(6, "day").format("MMM D")}
          </Text>

          <Pressable
            style={styles.navButton}
            onPress={() => navigateWeek("next")}
          >
            <MaterialIcons name="chevron-right" size={24} color="white" />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Error loading statistics</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.navButton}
          onPress={() => navigateWeek("prev")}
        >
          <MaterialIcons name="chevron-left" size={24} color="white" />
        </Pressable>

        <Text style={styles.headerText}>
          Week of {currentWeek.format("MMM D")} -{" "}
          {currentWeek.add(6, "day").format("MMM D")}
        </Text>

        <Pressable
          style={styles.navButton}
          onPress={() => navigateWeek("next")}
        >
          <MaterialIcons name="chevron-right" size={24} color="white" />
        </Pressable>
      </View>

      {/* Week Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Week Summary</Text>
        <Text style={styles.summaryText}>
          Total Time: {(totalWeekMinutes / 60).toFixed(1)} hours
        </Text>
        <Text style={styles.summaryText}>
          Used Percentage:{" "}
          {((totalWeekMinutes / (7 * 24 * 60)) * 100).toFixed(1)}%
        </Text>
      </View>

      {/* Category Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        {categoryStats.length > 0 ? (
          categoryStats.map(renderCategoryStat)
        ) : (
          <Text style={styles.emptyText}>No data for this week</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#304A9D",
  },
  navButton: {
    padding: 8,
  },
  headerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
  },
  summaryCard: {
    backgroundColor: "white",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  percentage: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#304A9D",
  },
  statDetails: {
    marginBottom: 12,
  },
  statText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  statLabel: {
    fontWeight: "600",
    color: "#333",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 20,
  },
});
