// app/(tabs)/today.tsx
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useCategories,
  useDeleteRecord,
  useInsertRecord,
  useTodayRecords,
  useUpdateRecord,
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

export type RecordItem = {
  id: number;
  description: string;
  minutes: number;
  timestamp: number;
  categoryId: number | null;
};

export type Category = {
  id: number;
  name: string;
  colorHex: string | null;
  createdAt: number;
};

// Safe-area height for Android status bar
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

export default function TodayScreen() {
  // React Query hooks for data fetching with caching
  const { data: records = [] } = useTodayRecords();
  const { data: categories = [] } = useCategories();

  // Mutation hooks for database operations
  const insertRecordMutation = useInsertRecord();
  const updateRecordMutation = useUpdateRecord();
  const deleteRecordMutation = useDeleteRecord();

  // Local UI state
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [resizingRecord, setResizingRecord] = useState<number | null>(null);
  const [recordName, setRecordName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [finishTime, setFinishTime] = useState<Date>(
    new Date(Date.now() + 60 * 60 * 1000)
  ); // 1 hour later
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showFinishPicker, setShowFinishPicker] = useState(false);

  // Separate state for edit modal pickers
  const [showEditStartPicker, setShowEditStartPicker] = useState(false);
  const [showEditFinishPicker, setShowEditFinishPicker] = useState(false);

  // OPTIMIZED: Use custom hook for current time with minimal re-renders
  const currentTime = useCurrentTime(5); // 5-minute intervals

  // OPTIMIZED: Use custom hook for default category selection
  const setMinutesCallback = useCallback(
    (mins: string) => setMinutes(mins),
    []
  );
  useDefaultCategory(categories, selectedCategoryId, setSelectedCategoryId);

  // OPTIMIZED: Use custom hook for time calculations (only for add modal)
  useTimeCalculation(startTime, finishTime, setMinutesCallback);

  // OPTIMIZED: Separate effect for edit modal time calculation to avoid conflicts
  useEffect(() => {
    if (editModalVisible) {
      const diffMs = finishTime.getTime() - startTime.getTime();
      const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
      setMinutes(diffMinutes.toString());
    }
  }, [startTime, finishTime, editModalVisible]);

  // Memoize hour grid generation for performance
  const hourGrid = useMemo(() => {
    const hourLabels = generateHourLabels();
    return hourLabels.map(
      ({ hour, label }: { hour: number; label: string }) => (
        <View key={hour} style={[styles.hourRow, { top: hour * HOUR_HEIGHT }]}>
          <Text style={styles.hourLabel}>{label}</Text>
          <View style={styles.hourLine} />
        </View>
      )
    );
  }, []);

  // Memoize current time position
  const currentTimePosition = useMemo(() => {
    return getCurrentTimePosition(currentTime);
  }, [currentTime]);

  // Memoize record position calculations and color conversion
  const recordBlocks = useMemo(() => {
    return records.map((r: RecordItem) => {
      const { top, height } = getRecordPosition(r.timestamp, r.minutes);
      const isResizing = resizingRecord === r.id;
      const category = categories.find((c: Category) => c.id === r.categoryId);
      const baseColor = category?.colorHex || "#a0c4ff";
      const categoryColor = hexToRgba(baseColor, 0.5);

      return { ...r, top, height, isResizing, category, categoryColor };
    });
  }, [records, categories, resizingRecord]);

  // OPTIMIZED: Memoize modal form reset to prevent recreating on every render
  const resetModalForm = useCallback(() => {
    setRecordName("");
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : null);
    setMinutes("");
    setStartTime(new Date());
    setFinishTime(new Date(Date.now() + 60 * 60 * 1000));
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
    setEditModalVisible(false);
  }, [categories]);

  // OPTIMIZED: Memoize record editing function
  const handleEditRecord = useCallback((record: RecordItem) => {
    setEditingRecord(record);
    setRecordName(record.description);
    setSelectedCategoryId(record.categoryId);
    const recordTime = dayjs(record.timestamp);
    setStartTime(recordTime.toDate());
    setFinishTime(recordTime.add(record.minutes, "minute").toDate());
    setMinutes(record.minutes.toString());
    setEditModalVisible(true);
  }, []);

  // OPTIMIZED: Memoize update record function
  const handleUpdateRecord = useCallback(async () => {
    if (!editingRecord) return;

    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins <= 0) return;

    // Use the current date but with the selected start time
    const ts = dayjs()
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
    resetEditForm,
  ]);

  // OPTIMIZED: Memoize delete record function
  const handleDeleteRecord = useCallback(() => {
    if (!editingRecord) return;
    deleteRecordMutation.mutate(editingRecord.id);
    resetEditForm();
  }, [editingRecord, deleteRecordMutation, resetEditForm]);

  // OPTIMIZED: Memoize long press handler
  const handleLongPress = useCallback((recordId: number) => {
    setResizingRecord((prev) => (prev === recordId ? null : recordId));
  }, []);

  // OPTIMIZED: Memoize adjust record time function
  const adjustRecordTime = useCallback(
    async (
      recordId: number,
      action: "extend" | "shrink" | "move-earlier" | "move-later"
    ) => {
      const record = records.find((r: RecordItem) => r.id === recordId);
      if (!record) return;

      let newMinutes = record.minutes;
      let newTimestamp = record.timestamp;

      switch (action) {
        case "extend":
          newMinutes += 15; // Add 15 minutes
          break;
        case "shrink":
          newMinutes = Math.max(15, newMinutes - 15); // Remove 15 minutes, minimum 15
          break;
        case "move-earlier":
          newTimestamp = dayjs(record.timestamp)
            .subtract(15, "minute")
            .valueOf();
          break;
        case "move-later":
          newTimestamp = dayjs(record.timestamp).add(15, "minute").valueOf();
          break;
      }

      updateRecordMutation.mutate({
        id: recordId,
        categoryId: null,
        description: record.description,
        minutes: newMinutes,
        timestamp: newTimestamp,
      });
    },
    [records, updateRecordMutation]
  );

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Today: {dayjs().format("dddd")}</Text>
      </View>

      {/* Timeline */}
      <ScrollView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        <Pressable
          style={{
            height: TIMELINE_HEIGHT,
            position: "relative",
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#ddd",
          }}
          onPress={() => setResizingRecord(null)}
        >
          {/* Memoized hour grid */}
          {hourGrid}

          {/* Memoized current time indicator */}
          <View style={[styles.currentTimeLine, { top: currentTimePosition }]}>
            <View style={styles.currentTimeCircle} />
            <View style={styles.currentTimeLineBar} />
          </View>

          {/* Memoized record blocks */}
          {recordBlocks.map((recordData: any) => {
            return (
              <Pressable
                key={recordData.id}
                style={[
                  styles.eventBox,
                  {
                    top: recordData.top,
                    height: recordData.height,
                    minHeight: 44,
                    backgroundColor: recordData.categoryColor,
                  },
                  recordData.isResizing && styles.eventBoxResizing,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (recordData.isResizing) return;
                  handleEditRecord(recordData);
                }}
                onLongPress={(e) => {
                  e.stopPropagation();
                  handleLongPress(recordData.id);
                }}
              >
                {/* Resize controls - only show when resizing */}
                {recordData.isResizing && (
                  <>
                    {/* Top controls */}
                    <View style={[styles.resizeControls, styles.topControls]}>
                      <Pressable
                        style={styles.resizeButton}
                        onPress={() =>
                          adjustRecordTime(recordData.id, "move-earlier")
                        }
                      >
                        <Text style={styles.resizeButtonText}>
                          ↑ Move Earlier
                        </Text>
                      </Pressable>
                    </View>

                    {/* Bottom controls */}
                    <View
                      style={[styles.resizeControls, styles.bottomControls]}
                    >
                      <Pressable
                        style={[styles.resizeButton, { marginRight: 2 }]}
                        onPress={() =>
                          adjustRecordTime(recordData.id, "shrink")
                        }
                      >
                        <Text style={styles.resizeButtonText}>- Shrink</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.resizeButton, { marginRight: 2 }]}
                        onPress={() =>
                          adjustRecordTime(recordData.id, "extend")
                        }
                      >
                        <Text style={styles.resizeButtonText}>+ Extend</Text>
                      </Pressable>
                      <Pressable
                        style={styles.resizeButton}
                        onPress={() =>
                          adjustRecordTime(recordData.id, "move-later")
                        }
                      >
                        <Text style={styles.resizeButtonText}>
                          ↓ Move Later
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}

                {/* Regular content - only show when not resizing */}
                {!recordData.isResizing && (
                  <>
                    {/* Top resize handle */}
                    <View style={[styles.resizeHandle, styles.topHandle]} />

                    <View style={styles.eventContent}>
                      <View>
                        <Text style={styles.eventTitle}>
                          {recordData.description || "Untitled"}
                        </Text>
                        <Text style={styles.eventCategory}>
                          {recordData.category?.name || "No Category"}
                        </Text>
                      </View>
                      <Text style={styles.eventDuration}>
                        {recordData.minutes} min
                      </Text>
                    </View>

                    {/* Bottom resize handle */}
                    <View style={[styles.resizeHandle, styles.bottomHandle]} />
                  </>
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <MaterialIcons name="add" size={28} color="white" />
      </Pressable>

      {/* Add‑record modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New record</Text>

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
                Duration (calculated): {minutes} minutes
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
              <Pressable
                style={styles.saveBtn}
                onPress={async () => {
                  const mins = parseInt(minutes, 10);
                  if (isNaN(mins) || mins <= 0) return;
                  const ts = dayjs()
                    .hour(startTime.getHours())
                    .minute(startTime.getMinutes())
                    .second(0)
                    .millisecond(0)
                    .valueOf();

                  insertRecordMutation.mutate({
                    categoryId: selectedCategoryId,
                    description: recordName.trim(),
                    minutes: mins,
                    timestamp: ts,
                  });
                  resetModalForm();
                }}
              >
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
                Duration (calculated): {minutes} minutes
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

            <Pressable
              onPress={() => setShowEditFinishPicker(true)}
              style={styles.timeButton}
            >
              <Text style={styles.timeButtonText}>
                Finish: {dayjs(finishTime).format("HH:mm")}
              </Text>
            </Pressable>

            {/* Edit modal time pickers */}
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
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    paddingTop: 2 + STATUS_BAR_HEIGHT,
    backgroundColor: "#304A9D",
  },
  headerText: { color: "white", fontSize: 18, fontWeight: "bold" },

  hourRow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
    backgroundColor: "transparent",
  },
  hourLabel: {
    position: "absolute",
    left: 8,
    top: 2,
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    backgroundColor: "white",
    paddingHorizontal: 4,
  },
  hourLine: {
    position: "absolute",
    left: 60,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: "transparent",
  },

  eventBox: {
    position: "absolute",
    left: 70,
    right: 10,
    backgroundColor: "#a0c4ff",
    borderRadius: 8,
    padding: 6,
  },
  eventBoxResizing: {
    borderColor: "#ff0000",
    borderWidth: 2,
    shadowColor: "#ff0000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  eventTitle: { fontWeight: "600", color: "#000000", fontSize: 16 },
  eventDuration: { fontSize: 14, color: "#000000" },
  eventCategory: {
    fontSize: 14,
    color: "#000000",
    marginTop: 2,
  },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#304A9D",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  /* modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "#0006",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
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
  timeButtonText: { fontSize: 14 },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  saveBtn: {
    backgroundColor: "#304A9D",
    padding: 10,
    borderRadius: 6,
    marginRight: 8,
  },
  cancelBtn: { backgroundColor: "#999", padding: 10, borderRadius: 6 },
  btnText: { color: "white" },
  deleteBtn: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 6,
    marginRight: 8,
  },

  currentTimeLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#ff0000", // Red color for current time indicator
    zIndex: 1, // Ensure it's above other elements
  },
  currentTimeCircle: {
    position: "absolute",
    left: 50,
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff0000",
    borderWidth: 2,
    borderColor: "white",
  },
  currentTimeLineBar: {
    position: "absolute",
    left: 60,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: "#ff0000",
  },

  resizeHandle: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 3,
    marginHorizontal: 10,
    zIndex: 1,
  },
  topHandle: {
    top: 2,
  },
  bottomHandle: {
    bottom: 2,
  },
  eventContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2, // Ensure text is above any handles
  },
  resizeControls: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 30,
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 4,
    marginHorizontal: 2,
    padding: 2,
  },
  resizeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(48, 74, 157, 0.8)",
    borderRadius: 3,
    marginHorizontal: 1,
    paddingVertical: 2,
  },
  resizeButtonText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  topControls: {
    top: 0,
  },
  bottomControls: {
    bottom: 0,
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
    maxHeight: 150, // Limit height for picker
    overflow: "hidden",
  },
  categoryOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#333",
  },
});
