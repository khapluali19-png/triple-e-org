import fs from "fs";
import path from "path";
import os from "os";
import { CategoryId, CategorySheetConnection, CategorySheetsStore, CenterSheetConnection } from "../types";
import { DEFAULT_CENTER_SHEETS_CONFIG, EXAMINATION_CENTERS } from "../constants";
import { logAdminActivity } from "./adminAuthStore";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const CONFIG_FILE = path.join(DATA_DIR, "category-sheets-config.json");
const TMP_CONFIG_FILE = path.join(os.tmpdir(), "triple-e-category-sheets-config.json");
const BENCHMARK_SPREADSHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

const DEFAULT_STORE: CategorySheetsStore = {
  version: "2.1.0",
  updatedAt: new Date().toISOString(),
  serviceAccountConfigured: false,
  centers: DEFAULT_CENTER_SHEETS_CONFIG,
  categories: {
    lower: {
      categoryId: "lower",
      categoryTitle: "Lower Class Category",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
      spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      worksheetName: "LowerClass",
      headerRowIndex: 1,
      status: "connected",
      lastTestedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      columnMappings: {
        rollNumber: "Roll No",
        studentName: "Student Name",
        fatherName: "Father Name",
        schoolName: "School",
        district: "District",
        obtainedMarks: "Obtained Marks",
        totalMarks: "Total Marks",
        percentage: "Percentage",
        grade: "Grade",
        passFailStatus: "Status",
        rank: "Position",
      },
      availableWorksheets: ["LowerClass", "Summary"],
      detectedHeaders: [
        "Roll No",
        "Student Name",
        "Father Name",
        "School",
        "District",
        "Obtained Marks",
        "Total Marks",
        "Percentage",
        "Grade",
        "Status",
        "Position",
      ],
    },
    middle: {
      categoryId: "middle",
      categoryTitle: "Middle Class Category",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
      spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      worksheetName: "MiddleClass",
      headerRowIndex: 1,
      status: "connected",
      lastTestedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      columnMappings: {
        rollNumber: "Roll Number",
        studentName: "Candidate Name",
        fatherName: "Father's Name",
        schoolName: "Institution",
        district: "District",
        classOrSection: "Class / Section",
        obtainedMarks: "Marks Scored",
        totalMarks: "Max Marks",
        percentage: "Percent",
        grade: "Grade",
        passFailStatus: "Result",
        rank: "Rank",
      },
      availableWorksheets: ["MiddleClass", "Summary"],
      detectedHeaders: [
        "Roll Number",
        "Candidate Name",
        "Father's Name",
        "Institution",
        "District",
        "Class / Section",
        "Marks Scored",
        "Max Marks",
        "Percent",
        "Grade",
        "Result",
        "Rank",
      ],
    },
    overall: {
      categoryId: "overall",
      categoryTitle: "Overall Championship Track",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
      spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      worksheetName: "OverallResults",
      headerRowIndex: 1,
      status: "connected",
      lastTestedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      columnMappings: {
        rollNumber: "Roll No",
        studentName: "Student Name",
        fatherName: "Guardian Name",
        schoolName: "School / College",
        district: "District",
        obtainedMarks: "Total Obtained",
        totalMarks: "Grand Total",
        percentage: "Percentage",
        grade: "Grade",
        passFailStatus: "Remarks",
        rank: "Merit Position",
      },
      availableWorksheets: ["OverallResults", "Ranks"],
      detectedHeaders: [
        "Roll No",
        "Student Name",
        "Guardian Name",
        "School / College",
        "District",
        "Total Obtained",
        "Grand Total",
        "Percentage",
        "Grade",
        "Remarks",
        "Merit Position",
      ],
    },
  },
};

function ensureDirExists(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

let inMemoryCategoryStore: CategorySheetsStore | null = null;
let lastPersistedTimestamp = 0;

export function getServerCategoryStore(): CategorySheetsStore {
  let fileContent: string | null = null;
  let fileMtime = 0;

  // 1. Check workspace CONFIG_FILE first (primary repository configuration)
  try {
    ensureDirExists(DATA_DIR);
    if (fs.existsSync(CONFIG_FILE)) {
      const stats = fs.statSync(CONFIG_FILE);
      fileContent = fs.readFileSync(CONFIG_FILE, "utf-8");
      fileMtime = stats.mtimeMs;
    }
  } catch {
    // file read error ignored
  }

  // 2. Check /tmp file (prefer if newer, supporting serverless runtimes and restarts)
  try {
    if (fs.existsSync(TMP_CONFIG_FILE)) {
      const stats = fs.statSync(TMP_CONFIG_FILE);
      if (!fileContent || stats.mtimeMs > fileMtime) {
        fileContent = fs.readFileSync(TMP_CONFIG_FILE, "utf-8");
        fileMtime = stats.mtimeMs;
      }
    }
  } catch {
    // /tmp read error ignored
  }

  // 3. If in-memory store is newer than disk files, preserve in-memory
  if (inMemoryCategoryStore && lastPersistedTimestamp >= fileMtime && fileMtime > 0) {
    return inMemoryCategoryStore;
  }

  // 4. Parse content from disk if available
  if (fileContent) {
    try {
      const parsed = JSON.parse(fileContent) as CategorySheetsStore;

      // Ensure centers exist, preserving all saved custom center connections
      parsed.centers = {
        ...DEFAULT_CENTER_SHEETS_CONFIG,
        ...(parsed.centers || {}),
      };

      // If a custom primary spreadsheet is set, propagate to any center still on default benchmark
      if (
        parsed.primarySpreadsheetId &&
        parsed.primarySpreadsheetId !== BENCHMARK_SPREADSHEET_ID
      ) {
        for (const [key, center] of Object.entries(parsed.centers)) {
          if (center.spreadsheetId === BENCHMARK_SPREADSHEET_ID && center.status !== "disconnected") {
            parsed.centers[key] = {
              ...center,
              spreadsheetId: parsed.primarySpreadsheetId,
              spreadsheetUrl: parsed.primarySpreadsheetUrl || center.spreadsheetUrl,
            };
          }
        }
      }

      // Dynamically update service account indicator from server environment
      parsed.serviceAccountConfigured = !!(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY
      );
      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        parsed.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      }

      inMemoryCategoryStore = parsed;
      lastPersistedTimestamp = fileMtime || Date.now();
      return parsed;
    } catch (error) {
      console.error("Failed to parse category store file, using in-memory or defaults:", error);
    }
  }

  if (inMemoryCategoryStore) {
    return inMemoryCategoryStore;
  }

  // 5. Initial fallback store
  const hasServiceAccount = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
  const initialStore: CategorySheetsStore = {
    ...DEFAULT_STORE,
    serviceAccountConfigured: hasServiceAccount,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || undefined,
  };

  try {
    ensureDirExists(DATA_DIR);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialStore, null, 2), "utf-8");
  } catch {
    // serverless read-only
  }
  try {
    fs.writeFileSync(TMP_CONFIG_FILE, JSON.stringify(initialStore, null, 2), "utf-8");
  } catch {
    // /tmp write ignored
  }

  inMemoryCategoryStore = initialStore;
  lastPersistedTimestamp = Date.now();
  return initialStore;
}

export function saveServerCategoryStore(updated: CategorySheetsStore): void {
  const dataToSave: CategorySheetsStore = {
    ...updated,
    updatedAt: new Date().toISOString(),
  };

  inMemoryCategoryStore = dataToSave;
  lastPersistedTimestamp = Date.now();

  // 1. Write directly to repository workspace file (works in local dev and persistent servers)
  try {
    ensureDirExists(DATA_DIR);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[ConfigStore] Workspace file write bypassed in serverless environment:", err?.message || err);
  }

  // 2. Write to /tmp (guaranteed writable across AWS Lambda, Vercel Serverless, Linux, Mac, Windows)
  try {
    fs.writeFileSync(TMP_CONFIG_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[ConfigStore] /tmp write failed:", err?.message || err);
  }

  try {
    logAdminActivity(
      "Google Sheets Config Updated",
      "Administrator",
      "Connected Google Sheets ledger configuration permanently saved."
    );
  } catch {
    // log failure ignored
  }
}

export function updateCategoryConnection(
  categoryId: CategoryId,
  updates: Partial<CategorySheetConnection>
): CategorySheetConnection {
  const store = getServerCategoryStore();
  const existing = store.categories[categoryId] || DEFAULT_STORE.categories[categoryId];

  const merged: CategorySheetConnection = {
    ...existing,
    ...updates,
    categoryId,
  };

  store.categories[categoryId] = merged;

  if (
    merged.spreadsheetId &&
    merged.spreadsheetId !== BENCHMARK_SPREADSHEET_ID &&
    merged.status !== "disconnected"
  ) {
    store.primarySpreadsheetId = merged.spreadsheetId;
    if (merged.spreadsheetUrl) {
      store.primarySpreadsheetUrl = merged.spreadsheetUrl;
    }
  }

  saveServerCategoryStore(store);
  return merged;
}

export function getServerCenterStore(): Record<string, CenterSheetConnection> {
  const store = getServerCategoryStore();
  return store.centers || DEFAULT_CENTER_SHEETS_CONFIG;
}

export function getCenterConnection(centerId: string): CenterSheetConnection | undefined {
  const centers = getServerCenterStore();
  const cleanId = centerId.trim().toLowerCase();
  const conn = centers[cleanId];
  if (!conn) return undefined;

  const store = getServerCategoryStore();
  // If the center still points to default benchmark sheet, but the admin has connected a custom primary spreadsheet,
  // route to the admin's saved custom sheet
  if (
    store.primarySpreadsheetId &&
    store.primarySpreadsheetId !== BENCHMARK_SPREADSHEET_ID &&
    conn.spreadsheetId === BENCHMARK_SPREADSHEET_ID &&
    conn.status !== "disconnected"
  ) {
    return {
      ...conn,
      spreadsheetId: store.primarySpreadsheetId,
      spreadsheetUrl: store.primarySpreadsheetUrl || conn.spreadsheetUrl,
    };
  }

  return conn;
}

export function updateCenterConnection(
  centerId: string,
  updates: Partial<CenterSheetConnection>
): CenterSheetConnection {
  const store = getServerCategoryStore();
  const cleanId = centerId.trim().toLowerCase();
  if (!store.centers) {
    store.centers = { ...DEFAULT_CENTER_SHEETS_CONFIG };
  }

  const existing = store.centers[cleanId] || DEFAULT_CENTER_SHEETS_CONFIG[cleanId] || {
    centerId: cleanId,
    centerName: updates.centerName || cleanId,
    spreadsheetUrl: "",
    spreadsheetId: "",
    worksheetName: updates.worksheetName || cleanId,
    headerRowIndex: 1,
    status: "disconnected",
    lastTestedAt: null,
    lastSyncedAt: null,
    columnMappings: {
      studentName: "Name",
      fatherName: "Father Name",
      classOrSection: "Class",
      schoolName: "School",
      tehsil: "Tehsil",
      totalMarks: "Total Marks",
      obtainedMarks: "Obt. Marks",
      level: "Level",
      rollNumber: "Roll No",
    },
    availableWorksheets: [],
    detectedHeaders: [],
  };

  const merged: CenterSheetConnection = {
    ...existing,
    ...updates,
    centerId: cleanId,
  };

  store.centers[cleanId] = merged;

  // Persist custom sheet as primary spreadsheet so it remains permanently active
  if (
    merged.spreadsheetId &&
    merged.spreadsheetId !== BENCHMARK_SPREADSHEET_ID &&
    merged.status !== "disconnected"
  ) {
    store.primarySpreadsheetId = merged.spreadsheetId;
    if (merged.spreadsheetUrl) {
      store.primarySpreadsheetUrl = merged.spreadsheetUrl;
    }
  }

  saveServerCategoryStore(store);
  return merged;
}

export function updateAllCentersConnection(
  updates: Partial<CenterSheetConnection>
): Record<string, CenterSheetConnection> {
  const store = getServerCategoryStore();
  if (!store.centers) {
    store.centers = { ...DEFAULT_CENTER_SHEETS_CONFIG };
  }

  if (
    updates.spreadsheetId &&
    updates.spreadsheetId !== BENCHMARK_SPREADSHEET_ID &&
    updates.status !== "disconnected"
  ) {
    store.primarySpreadsheetId = updates.spreadsheetId;
    if (updates.spreadsheetUrl) {
      store.primarySpreadsheetUrl = updates.spreadsheetUrl;
    }
  }

  for (const center of EXAMINATION_CENTERS) {
    const cleanId = center.id.toLowerCase();
    const existing = store.centers[cleanId] || DEFAULT_CENTER_SHEETS_CONFIG[cleanId] || {
      centerId: cleanId,
      centerName: center.name,
      spreadsheetUrl: "",
      spreadsheetId: "",
      worksheetName: center.name,
      headerRowIndex: 1,
      status: "disconnected",
      lastTestedAt: null,
      lastSyncedAt: null,
      columnMappings: {
        studentName: "Name",
        fatherName: "Father Name",
        classOrSection: "Class",
        schoolName: "School",
        tehsil: center.tehsil || "Tehsil",
        totalMarks: "Total Marks",
        obtainedMarks: "Obt. Marks",
        level: "Level",
        rollNumber: "Roll No",
      },
      availableWorksheets: [],
      detectedHeaders: [],
    };

    store.centers[cleanId] = {
      ...existing,
      ...updates,
      centerId: cleanId,
      centerName: center.name,
      worksheetName: updates.worksheetName || existing.worksheetName || center.name,
    };
  }

  // Also synchronize categories if custom spreadsheet is provided
  if (updates.spreadsheetId && updates.spreadsheetUrl && updates.status !== "disconnected") {
    for (const catKey of Object.keys(store.categories) as CategoryId[]) {
      if (store.categories[catKey]) {
        store.categories[catKey].spreadsheetId = updates.spreadsheetId;
        store.categories[catKey].spreadsheetUrl = updates.spreadsheetUrl;
        store.categories[catKey].status = updates.status || "connected";
        store.categories[catKey].lastSyncedAt = new Date().toISOString();
      }
    }
  }

  saveServerCategoryStore(store);
  return store.centers;
}
