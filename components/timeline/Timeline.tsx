import dayjs from "dayjs";
import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Category, RecordItem } from "../../app/(tabs)/today";

const HOUR_HEIGHT = 60;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
const TIMELINE_HEIGHT = 24 * HOUR_HEIGHT;

interface TimelineProps {
  records: RecordItem[];
  categories: Category[];
  onEditRecord: (record: RecordItem) => void;
  onLongPressRecord: (recordId: number) => void;
  resizingRecord: number | null;
  hexToRgba: (hex: string, alpha: number) => string;
}

const Timeline: React.FC<TimelineProps> = ({
  records,
  categories,
  onEditRecord,
  onLongPressRecord,
  resizingRecord,
  hexToRgba,
}) => {
  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.timelineContainer}>
        {/* Hour Grid */}
        {Array.from({ length: 24 }).map((_, hr) => (
          <View key={hr} style={[styles.hourRow, { top: hr * HOUR_HEIGHT }]}>
            <Text style={styles.hourLabel}>
              {dayjs().hour(hr).format("HH:00")}
            </Text>
            <View style={styles.hourLine} />
          </View>
        ))}

        {/* Record Blocks */}
        {records.map((r) => {
          const start = dayjs(r.timestamp);
          const top = (start.hour() * 60 + start.minute()) * MINUTE_HEIGHT;
          const height = r.minutes * MINUTE_HEIGHT;
          const isResizing = resizingRecord === r.id;
          const category = categories.find((c) => c.id === r.categoryId);
          const categoryColor = category?.colorHex || "#a0c4ff";

          return (
            <Pressable
              key={r.id}
              style={[
                styles.eventBox,
                { top, height, minHeight: 30, backgroundColor: categoryColor },
                isResizing && styles.eventBoxResizing,
              ]}
              onPress={() => (isResizing ? null : onEditRecord(r))}
              onLongPress={() => onLongPressRecord(r.id)}
            >
              {/* Content of the record box */}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  timelineContainer: {
    height: TIMELINE_HEIGHT,
    position: "relative",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  hourRow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    position: "absolute",
    left: 8,
    top: 2,
    fontSize: 12,
    color: "#333",
  },
  hourLine: {
    position: "absolute",
    left: 60,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: "#ccc",
  },
  eventBox: {
    position: "absolute",
    left: 70,
    right: 10,
    borderRadius: 8,
    padding: 6,
  },
  eventBoxResizing: {
    borderColor: "#ff0000",
    borderWidth: 2,
  },
  eventTitle: {
    fontWeight: "600",
    color: "#003d82",
  },
  eventCategory: {
    fontSize: 12,
    color: "#555",
  },
  eventDuration: {
    fontSize: 12,
    color: "#333",
  },
});

export default memo(Timeline);
