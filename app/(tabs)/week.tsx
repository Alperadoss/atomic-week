import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import React, { useEffect, useState } from "react";
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
  deleteRecord,
  getCategories,
  getRecordsByDateRange,
  insertRecord,
  updateRecord,
} from "../../src/db";

dayjs.extend(isoWeek);

const HOUR_HEIGHT = 60;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
const TIMELINE_HEIGHT = 24 * HOUR_HEIGHT;
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
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf("isoWeek"));
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

  const loadRecords = async () => {
    try {
      const weekStart = currentWeek.valueOf();
      const weekEnd = currentWeek.add(6, "day").endOf("day").valueOf();
      const result = await getRecordsByDateRange(weekStart, weekEnd);
      console.log("Loaded week records:", result);
      setRecords(result);
    } catch (e) {
      console.error("loadRecords", e);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await getCategories();
      setCategories(result);
      if (result.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(result[0].id);
      }
    } catch (e) {
      console.error("loadCategories", e);
    }
  };

  useEffect(() => {
    loadRecords();
    loadCategories();
  }, [currentWeek]);

  // Calculate minutes when start or finish time changes
  useEffect(() => {
    const diffMs = finishTime.getTime() - startTime.getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    setMinutes(diffMinutes.toString());
  }, [startTime, finishTime]);

  const navigateWeek = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentWeek(currentWeek.subtract(1, "week"));
    } else {
      setCurrentWeek(currentWeek.add(1, "week"));
    }
  };

  const handleCreateRecord = (day: dayjs.Dayjs, hour: number) => {
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
  };

  const handleSaveRecord = async () => {
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

    try {
      console.log("Inserting record with timestamp:", ts);
      await insertRecord({
        categoryId: selectedCategoryId,
        description: recordName.trim(),
        minutes: mins,
        timestamp: ts,
      });
      resetModalForm();
      loadRecords();
    } catch (e) {
      console.error("insertRecord", e);
    }
  };

  const handleEditRecord = (record: RecordItem) => {
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
  };

  const handleUpdateRecord = async () => {
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

    try {
      await updateRecord(
        editingRecord.id,
        selectedCategoryId,
        recordName.trim(),
        mins,
        ts
      );
      resetEditForm();
      loadRecords();
    } catch (e) {
      console.error("updateRecord", e);
    }
  };

  const handleDeleteRecord = async () => {
    console.log("Deleting record:", editingRecord?.id);
    if (!editingRecord) return;

    try {
      await deleteRecord(editingRecord.id);
      resetEditForm();
      loadRecords();
    } catch (e) {
      console.error("deleteRecord", e);
    }
  };

  const resetModalForm = () => {
    setRecordName("");
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : null);
    setMinutes("");
    setStartTime(new Date());
    setFinishTime(new Date(Date.now() + 60 * 60 * 1000));
    setSelectedDay(null);
    setShowCategoryPicker(false);
    setModalVisible(false);
  };

  const resetEditForm = () => {
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
  };

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    currentWeek.add(i, "day")
  );

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
              {/* Fixed Time Column - scrolls vertically but not horizontally */}
              <View style={styles.fixedTimeColumn}>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <View
                    key={hour}
                    style={[styles.timeSlot, { height: HOUR_HEIGHT }]}
                  >
                    <Text style={styles.timeLabel}>
                      {String(hour).padStart(2, "0")}:00
                    </Text>
                  </View>
                ))}
              </View>

              {/* Horizontally scrollable day columns with headers */}
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
              >
                <View style={styles.daysContentWithHeaders}>
                  {/* Each day as a complete column with header and content */}
                  {weekDays.map((day, dayIndex) => {
                    const dayRecords = records.filter(
                      (record) =>
                        dayjs(record.timestamp).format("YYYY-MM-DD") ===
                        day.format("YYYY-MM-DD")
                    );
                    const isToday =
                      day.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");

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

                          {/* Current time indicator for today */}
                          {isToday &&
                            (() => {
                              const now = dayjs();
                              const currentTop =
                                (now.hour() * 60 + now.minute()) *
                                MINUTE_HEIGHT;
                              return (
                                <View
                                  style={[
                                    styles.currentTimeLine,
                                    { top: currentTop },
                                  ]}
                                >
                                  <View style={styles.currentTimeIndicator} />
                                </View>
                              );
                            })()}

                          {/* Records */}
                          {dayRecords.map((record) => {
                            const recordTime = dayjs(record.timestamp);
                            const top =
                              (recordTime.hour() * 60 + recordTime.minute()) *
                              MINUTE_HEIGHT;
                            const height = record.minutes * MINUTE_HEIGHT;
                            const category = categories.find(
                              (c) => c.id === record.categoryId
                            );
                            const baseColor = category?.colorHex || "#a0c4ff";
                            // Convert hex to rgba with 50% opacity
                            const hexToRgba = (
                              hex: string,
                              opacity: number
                            ) => {
                              const r = parseInt(hex.slice(1, 3), 16);
                              const g = parseInt(hex.slice(3, 5), 16);
                              const b = parseInt(hex.slice(5, 7), 16);
                              return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                            };
                            const categoryColor = hexToRgba(baseColor, 0.5);

                            return (
                              <Pressable
                                key={record.id}
                                style={[
                                  styles.recordBlock,
                                  {
                                    top,
                                    height: Math.max(height, 20),
                                    backgroundColor: categoryColor,
                                  },
                                ]}
                                onPress={() => handleEditRecord(record)}
                              >
                                <Text
                                  style={styles.recordTitle}
                                  numberOfLines={2}
                                >
                                  {record.description}
                                </Text>
                                <Text style={styles.recordTime}>
                                  {recordTime.format("HH:mm")} ({record.minutes}
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
                {categories.find((c) => c.id === selectedCategoryId)?.name ||
                  "Select category"}
              </Text>
            </Pressable>

            {showCategoryPicker && (
              <View style={styles.categoryPicker}>
                {categories.map((category) => (
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
                {categories.find((c) => c.id === selectedCategoryId)?.name ||
                  "Select category"}
              </Text>
            </Pressable>

            {showEditCategoryPicker && (
              <View style={styles.categoryPicker}>
                {categories.map((category) => (
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
