import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  deleteCategory,
  getCategories,
  insertCategory,
  updateCategory,
} from "../../src/db";

// Safe-area height for Android status bar
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

type Category = {
  id: number;
  name: string;
  colorHex: string | null;
  createdAt: number;
};

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#ec4899", // Pink
  "#6b7280", // Gray
];

export default function SettingsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);

  const loadCategories = async () => {
    try {
      const result = await getCategories();
      setCategories(result);
    } catch (e) {
      console.error("loadCategories", e);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;

    try {
      await insertCategory(categoryName.trim(), selectedColor);
      resetForm();
      loadCategories();
    } catch (e) {
      console.error("addCategory", e);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryName.trim()) return;

    try {
      await updateCategory(
        editingCategory.id,
        categoryName.trim(),
        selectedColor
      );
      resetForm();
      loadCategories();
    } catch (e) {
      console.error("updateCategory", e);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${category.name}"? This will affect existing records.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(category.id);
              loadCategories();
            } catch (e) {
              console.error("deleteCategory", e);
            }
          },
        },
      ]
    );
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setSelectedColor(category.colorHex || PRESET_COLORS[0]);
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setCategoryName("");
    setSelectedColor(PRESET_COLORS[0]);
    setModalVisible(false);
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        <View
          style={[
            styles.colorIndicator,
            { backgroundColor: item.colorHex || "#ccc" },
          ]}
        />
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
      <View style={styles.categoryActions}>
        <Pressable
          style={styles.editButton}
          onPress={() => handleEditCategory(item)}
        >
          <MaterialIcons name="edit" size={20} color="#666" />
        </Pressable>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDeleteCategory(item)}
        >
          <MaterialIcons name="delete" size={20} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Settings</Text>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>Categories</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={24} color="#304A9D" />
        </Pressable>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No categories yet</Text>
        }
      />

      {/* Add/Edit Category Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingCategory ? "Edit Category" : "Add Category"}
            </Text>

            <TextInput
              placeholder="Category name"
              value={categoryName}
              onChangeText={setCategoryName}
              style={styles.input}
            />

            <Text style={styles.colorLabel}>Color:</Text>
            <View style={styles.colorPicker}>
              {PRESET_COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.saveButton}
                onPress={
                  editingCategory ? handleUpdateCategory : handleAddCategory
                }
              >
                <Text style={styles.buttonText}>
                  {editingCategory ? "Update" : "Add"}
                </Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.buttonText}>Cancel</Text>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 6,
    paddingTop: 2 + STATUS_BAR_HEIGHT,
    backgroundColor: "#304A9D",
  },
  headerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  subHeaderText: {
    color: "#495057",
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "rgba(48, 74, 157, 0.1)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: "#333",
  },
  categoryActions: {
    flexDirection: "row",
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 24,
    fontSize: 16,
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
    padding: 20,
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
    marginBottom: 16,
    fontSize: 16,
  },
  colorLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedColor: {
    borderColor: "#333",
    borderWidth: 3,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  saveButton: {
    backgroundColor: "#304A9D",
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: "#999",
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
