import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useCategories,
  useDeleteRecord,
  useInsertRecord,
  useUpdateRecord,
  useWeekRecords,
} from "../../src/hooks/useDatabase";
import {
  useCurrentTime,
  useDefaultCategory,
  useTimeCalculation,
} from "../../src/hooks/useOptimizedEffects";
import { hexToRgba } from "../../src/utils/colorUtils";
import {
  generateHourLabels,
  getCurrentTimePosition,
  getRecordPosition,
  HOUR_HEIGHT,
  TIMELINE_HEIGHT,
} from "../../src/utils/timelineUtils";

dayjs.extend(isoWeek);
const DAY_WIDTH = 120; // Width of each day column
const TIME_COLUMN_WIDTH = 50; // Narrower time column

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

export default function WeekScreen() {
  // Week state
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf("isoWeek"));

  // React Query hooks for data fetching with caching
  const weekStart = currentWeek.valueOf();
  const weekEnd = currentWeek.add(6, "day").endOf("day").valueOf();
  const { data: records = [], isLoading: recordsLoading } = useWeekRecords(
    weekStart,
    weekEnd
  );
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  // Mutation hooks for database operations
  const insertRecordMutation = useInsertRecord();
  const updateRecordMutation = useUpdateRecord();
  const deleteRecordMutation = useDeleteRecord();

  // Local UI state
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [recordName, setRecordName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [finishTime, setFinishTime] = useState<Date>(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const [selectedDay, setSelectedDay] = useState<dayjs.Dayjs | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showFinishPicker, setShowFinishPicker] = useState(false);
  const [showEditStartPicker, setShowEditStartPicker] = useState(false);
  const [showEditFinishPicker, setShowEditFinishPicker] = useState(false);

  // OPTIMIZED: Use custom hook for current time with minimal re-renders
  const currentTime = useCurrentTime(3); // 3-minute intervals

  // OPTIMIZED: Use custom hook for default category selection
  const setMinutesCallback = useCallback(
    (mins: string) => setMinutes(mins),
    []
  );
  useDefaultCategory(categories, selectedCategoryId, setSelectedCategoryId);

  // OPTIMIZED: Use custom hook for time calculations
  useTimeCalculation(startTime, finishTime, setMinutesCallback);

  // OPTIMIZED: Memoize navigation function
  const navigateWeek = useCallback((direction: "prev" | "next") => {
    setCurrentWeek((prev) =>
      direction === "prev" ? prev.subtract(1, "week") : prev.add(1, "week")
    );
  }, []);

  // OPTIMIZED: Memoize record creation handler
  const handleCreateRecord = useCallback(
    (day: dayjs.Dayjs, hour: number) => {
      console.log(
        "Creating record for:",
        day.format("YYYY-MM-DD"),
        "at hour:",
        hour
      );
      setSelectedDay(day);
      const defaultStart = day.hour(hour).minute(0).toDate();
      const defaultFinish = day
        .hour(hour + 1)
        .minute(0)
        .toDate();
      setStartTime(defaultStart);
      setFinishTime(defaultFinish);
      setRecordName("");
      setSelectedCategoryId(categories.length > 0 ? categories[0].id : null);
      setModalVisible(true);
    },
    [categories]
  );

  // OPTIMIZED: Memoize save record handler
  const handleSaveRecord = useCallback(async () => {
    console.log("Saving record:", {
      selectedDay,
      minutes,
      recordName,
      selectedCategoryId,
    });
    if (!selectedDay) {
      console.log("No selected day");
      return;
    }

    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins <= 0) {
      console.log("Invalid minutes:", minutes);
      return;
    }

    const ts = selectedDay
      .hour(startTime.getHours())
      .minute(startTime.getMinutes())
      .second(0)
      .millisecond(0)
      .valueOf();

    console.log("Inserting record with timestamp:", ts);
    insertRecordMutation.mutate({
      categoryId: selectedCategoryId,
      description: recordName.trim(),
      minutes: mins,
      timestamp: ts,
    });
    resetModalForm();
  }, [
    selectedDay,
    minutes,
    recordName,
    selectedCategoryId,
    startTime,
    insertRecordMutation,
  ]);

  // OPTIMIZED: Memoize edit record handler
  const handleEditRecord = useCallback((record: RecordItem) => {
    console.log("Editing record:", record);
    setEditingRecord(record);
    setRecordName(record.description);
    setSelectedCategoryId(record.categoryId);
    const recordTime = dayjs(record.timestamp);
    setStartTime(recordTime.toDate());
    setFinishTime(recordTime.add(record.minutes, "minute").toDate());
    setMinutes(record.minutes.toString());
    setShowEditCategoryPicker(false);
    setEditModalVisible(true);
  }, []);

  // OPTIMIZED: Memoize update record handler
  const handleUpdateRecord = useCallback(async () => {
    console.log("Updating record:", editingRecord?.id);
    if (!editingRecord) return;

    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins <= 0) return;

    const recordDay = dayjs(editingRecord.timestamp);
    const ts = recordDay
      .hour(startTime.getHours())
      .minute(startTime.getMinutes())
      .second(0)
      .millisecond(0)
      .valueOf();

    updateRecordMutation.mutate({
      id: editingRecord.id,
      categoryId: selectedCategoryId,
      description: recordName.trim(),
      minutes: mins,
      timestamp: ts,
    });
    resetEditForm();
  }, [
    editingRecord,
    minutes,
    startTime,
    selectedCategoryId,
    recordName,
    updateRecordMutation,
  ]);

  // OPTIMIZED: Memoize delete record handler
  const handleDeleteRecord = useCallback(() => {
    console.log("Deleting record:", editingRecord?.id);
    if (!editingRecord) return;

    deleteRecordMutation.mutate(editingRecord.id);
    resetEditForm();
  }, [editingRecord, deleteRecordMutation]);

  // OPTIMIZED: Memoize modal form reset
  const resetModalForm = useCallback(() => {
    setRecordName("");
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : null);
    setMinutes("");
    setStartTime(new Date());
    setFinishTime(new Date(Date.now() + 60 * 60 * 1000));
    setSelectedDay(null);
    setShowCategoryPicker(false);
    setModalVisible(false);
  }, [categories]);

  // OPTIMIZED: Memoize edit form reset
  const resetEditForm = useCallback(() => {
    setEditingRecord(null);
    setRecordName("");
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : null);
    setMinutes("");
    setStartTime(new Date());
    setFinishTime(new Date(Date.now() + 60 * 60 * 1000));
    setShowEditStartPicker(false);
    setShowEditFinishPicker(false);
    setShowEditCategoryPicker(false);
    setEditModalVisible(false);
  }, [categories]);

  // Memoize week days generation
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => currentWeek.add(i, "day"));
  }, [currentWeek]);

  // Memoize hour grid generation for performance
  const hourGrid = useMemo(() => {
    const hourLabels = generateHourLabels();
    return hourLabels.map(
      ({ hour, label }: { hour: number; label: string }) => (
        <View key={hour} style={[styles.timeSlot, { height: HOUR_HEIGHT }]}>
          <Text style={styles.timeLabel}>{label}</Text>
        </View>
      )
    );
  }, []);

  // Memoize current time position
  const currentTimePosition = useMemo(() => {
    return getCurrentTimePosition(currentTime);
  }, [currentTime]);

  // Memoize records grouped by day for performance
  const recordsByDay = useMemo(() => {
    const grouped = new Map<string, any[]>();
    records.forEach((record: any) => {
      const dayKey = dayjs(record.timestamp).format("YYYY-MM-DD");
      if (!grouped.has(dayKey)) {
        grouped.set(dayKey, []);
      }

      const { top, height } = getRecordPosition(
        record.timestamp,
        record.minutes
      );
      const category = categories.find((c: any) => c.id === record.categoryId);
      const baseColor = category?.colorHex || "#a0c4ff";
      const categoryColor = hexToRgba(baseColor, 0.5);

      grouped.get(dayKey)!.push({
        ...record,
        top,
        height,
        category,
        categoryColor,
      });
    });
    return grouped;
  }, [records, categories]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.navButton}
          onPress={() => navigateWeek("prev")}
        >
          <MaterialIcons name="chevron-left" size={24} color="white" />
        </Pressable>

        <Text style={styles.headerText}>
          {currentWeek.format("MMM D")} -{" "}
          {currentWeek.add(6, "day").format("MMM D, YYYY")}
        </Text>

        <Pressable
          style={styles.navButton}
          onPress={() => navigateWeek("next")}
        >
          <MaterialIcons name="chevron-right" size={24} color="white" />
        </Pressable>
      </View>

      {/* Week Timeline */}
      <View style={styles.timelineContainer}>
        {/* Scrollable Content - both vertical and horizontal */}
        <ScrollView style={styles.scrollView} horizontal={false}>
          <View style={styles.weekContentWrapper}>
            {/* Time and Days Content Row */}
            <View style={styles.contentRow}>
              {/* Fixed Time Column - memoized for performance */}
              <View style={styles.fixedTimeColumn}>{hourGrid}</View>

              {/* Horizontally scrollable day columns with headers */}
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
              >
                <View style={styles.daysContentWithHeaders}>
                  {/* Each day as a complete column with header and content */}
                  {weekDays.map((day: any, dayIndex: any) => {
                    const dayKey = day.format("YYYY-MM-DD");
                    const dayRecords = recordsByDay.get(dayKey) || [];
                    const isToday = dayKey === dayjs().format("YYYY-MM-DD");

                    return (
                      <View key={dayIndex} style={styles.completeDayColumn}>
                        {/* Day Header */}
                        <View
                          style={[
                            styles.dayHeaderCell,
                            isToday && styles.todayColumn,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayName,
                              isToday && styles.todayText,
                            ]}
                          >
                            {day.format("ddd")}
                          </Text>
                          <Text
                            style={[
                              styles.dayNumber,
                              isToday && styles.todayText,
                            ]}
                          >
                            {day.format("D")}
                          </Text>
                        </View>

                        {/* Day Content */}
                        <View style={styles.dayColumn}>
                          {/* Hour slots */}
                          {Array.from({ length: 24 }).map((_, hour) => (
                            <Pressable
                              key={hour}
                              style={[styles.hourSlot, { height: HOUR_HEIGHT }]}
                              onPress={() => handleCreateRecord(day, hour)}
                            >
                              <View style={styles.hourSlotContent} />
                            </Pressable>
                          ))}

                          {/* Memoized current time indicator for today */}
                          {isToday && (
                            <View
                              style={[
                                styles.currentTimeLine,
                                { top: currentTimePosition },
                              ]}
                            >
                              <View style={styles.currentTimeIndicator} />
                            </View>
                          )}

                          {/* Memoized Records with pre-calculated positions */}
                          {dayRecords.map((recordData: any) => {
                            const recordTime = dayjs(recordData.timestamp);
                            return (
                              <Pressable
                                key={recordData.id}
                                style={[
                                  styles.recordBlock,
                                  {
                                    top: recordData.top,
                                    height: Math.max(recordData.height, 20),
                                    backgroundColor: recordData.categoryColor,
                                  },
                                ]}
                                onPress={() => handleEditRecord(recordData)}
                              >
                                <Text
                                  style={styles.recordTitle}
                                  numberOfLines={2}
                                >
                                  {recordData.description}
                                </Text>
                                <Text style={styles.recordTime}>
                                  {recordTime.format("HH:mm")} (
                                  {recordData.minutes}
                                  m)
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Add Record Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Record</Text>

            <TextInput
              placeholder="Record name"
              value={recordName}
              onChangeText={setRecordName}
              style={styles.input}
            />

            <Pressable
              onPress={() => setShowCategoryPicker(true)}
              style={styles.categoryButton}
            >
              <Text style={styles.categoryButtonText}>
                Category:{" "}
                {categories.find((c: Category) => c.id === selectedCategoryId)
                  ?.name || "Select category"}
              </Text>
            </Pressable>

            {showCategoryPicker && (
              <View style={styles.categoryPicker}>
                {categories.map((category: Category) => (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      { backgroundColor: category.colorHex || "#f0f0f0" },
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.categoryOptionText}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.minutesContainer}>
              <Text style={styles.minutesLabel}>
                Duration: {minutes} minutes
              </Text>
            </View>

            <Pressable
              onPress={() => setShowStartPicker(true)}
              style={styles.timeButton}
            >
              <Text style={styles.timeButtonText}>
                Start: {dayjs(startTime).format("HH:mm")}
              </Text>
            </Pressable>

            {showStartPicker && (
              <DateTimePicker
                mode="time"
                value={startTime}
                onChange={(_, d) => {
                  if (d) setStartTime(d);
                  setShowStartPicker(false);
                }}
              />
            )}

            <Pressable
              onPress={() => setShowFinishPicker(true)}
              style={styles.timeButton}
            >
              <Text style={styles.timeButtonText}>
                Finish: {dayjs(finishTime).format("HH:mm")}
              </Text>
            </Pressable>

            {showFinishPicker && (
              <DateTimePicker
                mode="time"
                value={finishTime}
                onChange={(_, d) => {
                  if (d) setFinishTime(d);
                  setShowFinishPicker(false);
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <Pressable style={styles.saveBtn} onPress={handleSaveRecord}>
                <Text style={styles.btnText}>Save</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={resetModalForm}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Record Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Record</Text>

            <TextInput
              placeholder="Record name"
              value={recordName}
              onChangeText={setRecordName}
              style={styles.input}
            />

            <Pressable
              onPress={() => setShowEditCategoryPicker(true)}
              style={styles.categoryButton}
            >
              <Text style={styles.categoryButtonText}>
                Category:{" "}
                {categories.find((c: Category) => c.id === selectedCategoryId)
                  ?.name || "Select category"}
              </Text>
            </Pressable>

            {showEditCategoryPicker && (
              <View style={styles.categoryPicker}>
                {categories.map((category: Category) => (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      { backgroundColor: category.colorHex || "#f0f0f0" },
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      setShowEditCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.categoryOptionText}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.minutesContainer}>
              <Text style={styles.minutesLabel}>
                Duration: {minutes} minutes
              </Text>
            </View>

            <Pressable
              onPress={() => setShowEditStartPicker(true)}
              style={styles.timeButton}
            >
              <Text style={styles.timeButtonText}>
                Start: {dayjs(startTime).format("HH:mm")}
              </Text>
            </Pressable>

            {showEditStartPicker && (
              <DateTimePicker
                mode="time"
                value={startTime}
                onChange={(_, d) => {
                  if (d) setStartTime(d);
                  setShowEditStartPicker(false);
                }}
              />
            )}

            <Pressable
              onPress={() => setShowEditFinishPicker(true)}
              style={styles.timeButton}
            >
              <Text style={styles.timeButtonText}>
                Finish: {dayjs(finishTime).format("HH:mm")}
              </Text>
            </Pressable>

            {showEditFinishPicker && (
              <DateTimePicker
                mode="time"
                value={finishTime}
                onChange={(_, d) => {
                  if (d) setFinishTime(d);
                  setShowEditFinishPicker(false);
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <Pressable style={styles.deleteBtn} onPress={handleDeleteRecord}>
                <Text style={styles.btnText}>Delete</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleUpdateRecord}>
                <Text style={styles.btnText}>Update</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={resetEditForm}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  daysHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    backgroundColor: "#f9f9f9",
  },
  dayColumn: {
    width: DAY_WIDTH,
    paddingVertical: 0,
    borderRightWidth: 1,
    borderRightColor: "#ddd",
    position: "relative",
  },
  dayName: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  dayNumber: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  weekContent: {
    backgroundColor: "#fff",
  },
  daysContent: {
    flexDirection: "row",
    minHeight: TIMELINE_HEIGHT,
  },
  timeSlot: {
    justifyContent: "flex-start",
    paddingTop: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  timeLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  hourSlot: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    width: "100%",
  },
  hourSlotContent: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
  },
  recordBlock: {
    position: "absolute",
    left: 2,
    right: 2,
    borderRadius: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  recordTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  recordTime: {
    fontSize: 8,
    color: "#000000",
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  categoryButton: {
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 12,
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#333",
  },
  categoryPicker: {
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    marginBottom: 12,
    maxHeight: 120,
    overflow: "hidden",
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#333",
  },
  minutesContainer: {
    marginBottom: 12,
  },
  minutesLabel: {
    fontSize: 14,
    color: "#555",
    fontStyle: "italic",
  },
  timeButton: {
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 12,
  },
  timeButtonText: {
    fontSize: 14,
    color: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  saveBtn: {
    backgroundColor: "#304A9D",
    padding: 10,
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelBtn: {
    backgroundColor: "#999",
    padding: 10,
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteBtn: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 6,
    marginRight: 8,
  },
  btnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  todayColumn: {
    backgroundColor: "#e0f7fa", // Light blue background for today
    borderWidth: 2,
    borderColor: "#304A9D", // Dark blue border for today
  },
  todayText: {
    color: "#304A9D", // Dark blue text for today
    fontWeight: "bold",
  },
  currentTimeLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#304A9D", // Dark blue line for current time
    zIndex: 1,
  },
  currentTimeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#304A9D", // Dark blue indicator
    position: "absolute",
    top: -5,
    left: "50%",
    transform: [{ translateX: -5 }],
  },
  timelineContainer: {
    flex: 1,
  },
  fixedTimeColumn: {
    width: TIME_COLUMN_WIDTH,
    backgroundColor: "#f0f0f0",
    borderRightWidth: 1,
    borderRightColor: "#ddd",
    paddingTop: 50, // Match day header height so 00:00 aligns correctly
  },
  weekContentWrapper: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  contentRow: {
    flexDirection: "row",
    flex: 1,
  },
  daysContentWithHeaders: {
    paddingTop: 6,
    flexDirection: "row",
  },
  completeDayColumn: {
    flexDirection: "column",
    width: DAY_WIDTH,
  },
  dayHeaderCell: {
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 8,
    alignItems: "center",
    height: 50, // Fixed height so time column can offset accordingly
  },
});
