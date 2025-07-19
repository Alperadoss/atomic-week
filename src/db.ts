import { openDatabaseSync, SQLiteDatabase } from "expo-sqlite";

// Open database connection
const db: SQLiteDatabase = openDatabaseSync("productivity_tracker.db");

// SQL statements for table creation
const CREATE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    colorHex TEXT,
    createdAt INTEGER
  );
`;

const CREATE_RECORDS_TABLE = `
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoryId INTEGER,
    description TEXT,
    minutes INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (categoryId) REFERENCES categories(id)
  );
`;

const CREATE_WEEK_STATS_TABLE = `
  CREATE TABLE IF NOT EXISTS week_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekStartIso TEXT NOT NULL,
    jsonPayload TEXT NOT NULL
  );
`;

// Initialize database tables
export const initializeDatabase = (): void => {
  try {
    // Create categories table
    db.execSync(CREATE_CATEGORIES_TABLE);

    // Create records table
    db.execSync(CREATE_RECORDS_TABLE);

    // Create week_stats table
    db.execSync(CREATE_WEEK_STATS_TABLE);

    // Seed default categories if they don't exist
    seedDefaultCategories();

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

// Seed default categories
export const seedDefaultCategories = (): void => {
  try {
    const existingCategories = getCategories();
    if (existingCategories.length === 0) {
      insertCategory("Work", "#3b82f6"); // Blue
      insertCategory("Exercise", "#10b981"); // Green
      insertCategory("Others", "#6b7280"); // Gray
      console.log("Default categories seeded");
    }
  } catch (error) {
    console.error("Failed to seed default categories:", error);
  }
};

// Export database instance for direct use
export { db };

// Helper function to execute SQL queries
export const executeQuery = (sql: string, params: any[] = []): any => {
  try {
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      return db.getAllSync(sql, params);
    } else {
      return db.runSync(sql, params);
    }
  } catch (error) {
    console.error("SQL execution failed:", error);
    throw error;
  }
};

// Database utility functions for each table

// Categories
export const insertCategory = (name: string, colorHex?: string): any => {
  const createdAt = Date.now();
  return executeQuery(
    "INSERT INTO categories (name, colorHex, createdAt) VALUES (?, ?, ?)",
    [name, colorHex || null, createdAt]
  );
};

export const getCategories = (): any => {
  return executeQuery("SELECT * FROM categories ORDER BY createdAt DESC");
};

export const updateCategory = (
  id: number,
  name?: string,
  colorHex?: string
): any => {
  const updates: string[] = [];
  const params: any[] = [];

  if (name !== undefined) {
    updates.push("name = ?");
    params.push(name);
  }

  if (colorHex !== undefined) {
    updates.push("colorHex = ?");
    params.push(colorHex);
  }

  if (updates.length === 0) {
    return null;
  }

  params.push(id);
  return executeQuery(
    `UPDATE categories SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
};

export const deleteCategory = (id: number): any => {
  return executeQuery("DELETE FROM categories WHERE id = ?", [id]);
};

interface RecordInput {
  categoryId: number | null;
  description: string;
  minutes: number;
  timestamp: number;
}

// Records
export const insertRecord = (record: RecordInput): any => {
  return executeQuery(
    "INSERT INTO records (categoryId, description, minutes, timestamp) VALUES (?, ?, ?, ?)",
    [record.categoryId, record.description, record.minutes, record.timestamp]
  );
};

export const getRecordsByDateRange = (
  startTimestamp: number,
  endTimestamp: number
): any => {
  return executeQuery(
    "SELECT * FROM records WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC",
    [startTimestamp, endTimestamp]
  );
};

export const updateRecord = (
  id: number,
  categoryId?: number | null,
  description?: string | null,
  minutes?: number,
  timestamp?: number
): any => {
  const updates: string[] = [];
  const params: any[] = [];

  if (categoryId !== undefined) {
    updates.push("categoryId = ?");
    params.push(categoryId);
  }

  if (description !== undefined) {
    updates.push("description = ?");
    params.push(description);
  }

  if (minutes !== undefined) {
    updates.push("minutes = ?");
    params.push(minutes);
  }

  if (timestamp !== undefined) {
    updates.push("timestamp = ?");
    params.push(timestamp);
  }

  if (updates.length === 0) {
    return null;
  }

  params.push(id);
  return executeQuery(
    `UPDATE records SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
};

export const deleteRecord = (id: number): any => {
  return executeQuery("DELETE FROM records WHERE id = ?", [id]);
};

// Utility function to get records for a specific day
export const fetchTodayRecords = (date: Date): any => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return getRecordsByDateRange(startOfDay.getTime(), endOfDay.getTime());
};

// Database initialization is handled in app/_layout.tsx
