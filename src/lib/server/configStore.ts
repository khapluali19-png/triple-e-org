import fs from "fs";
import path from "path";
import { CategoryId, CategorySheetConnection, CategorySheetsStore, CenterSheetConnection } from "../types";
import { DEFAULT_CENTER_SHEETS_CONFIG } from "../constants";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const CONFIG_FILE = path.join(DATA_DIR, "category-sheets-config.json");

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

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

let inMemoryCategoryStore: CategorySheetsStore | null = null;

export function getServerCategoryStore(): CategorySheetsStore {
  if (inMemoryCategoryStore) {
    return inMemoryCategoryStore;
  }

  try {
    ensureDirExists(DATA_DIR);
    if (!fs.existsSync(CONFIG_FILE)) {
      // Check if service account is present in environment
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
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialStore, null, 2), "utf-8");
      } catch {
        // serverless read-only
      }
      inMemoryCategoryStore = initialStore;
      return initialStore;
    }

    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as CategorySheetsStore;

    // Ensure centers exist and include all 15 examination centers
    parsed.centers = {
      ...DEFAULT_CENTER_SHEETS_CONFIG,
      ...(parsed.centers || {}),
    };

    // Dynamically update service account indicator from server environment
    parsed.serviceAccountConfigured = !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    );
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      parsed.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    }

    inMemoryCategoryStore = parsed;
    return parsed;
  } catch (error) {
    console.error("Failed to read server category store, using defaults:", error);
    inMemoryCategoryStore = DEFAULT_STORE;
    return DEFAULT_STORE;
  }
}

export function saveServerCategoryStore(updated: CategorySheetsStore): void {
  const dataToSave = {
    ...updated,
    updatedAt: new Date().toISOString(),
  };

  inMemoryCategoryStore = dataToSave;

  try {
    ensureDirExists(DATA_DIR);
    // Write atomically via temporary file
    const tempFile = `${CONFIG_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), "utf-8");
    fs.renameSync(tempFile, CONFIG_FILE);
  } catch (err: any) {
    console.warn("[ConfigStore] Filesystem is read-only (serverless). Saved in memory only:", err?.message || err);
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
  return centers[cleanId];
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
  saveServerCategoryStore(store);
  return merged;
}
