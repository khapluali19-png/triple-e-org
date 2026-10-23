export type CategoryId = "lower" | "middle" | "overall";

export interface CategoryInfo {
  id: CategoryId;
  title: string;
  subtitle: string;
  description: string;
  grades: string;
  subjects: string[];
  totalMarks: number;
  timeAllowed: string;
  isActive: boolean;
  colorScheme: "navy" | "gold" | "emerald";
}

export interface SubjectScore {
  name: string;
  obtained: number;
  total: number;
}

export type CenterId = 
  | "keris"
  | "kharfaq"
  | "ghwari"
  | "kuro"
  | "kharkoo"
  | "barah"
  | "khaplu"
  | "chorbat"
  | "ghursay"
  | "talis"
  | "kanday"
  | "hushe"
  | "thagus"
  | "dumsum"
  | "special-school";

export interface ExaminationCenterInfo {
  id: CenterId;
  name: string;
  tehsil?: string;
  description?: string;
}

export interface StudentResult {
  rollNumber?: string;
  studentName: string;
  fatherName?: string;
  schoolName?: string;
  tehsil?: string;
  district?: string;
  classOrSection?: string;
  examinationCenter?: string;
  centerId?: string;
  level?: string; // "Level 1" | "Level 2" | "Level 3"
  levelDescription?: string; // "Classes 4 to 8" | "Classes 8 to 12" | "Open for all"
  category?: CategoryId;
  categoryTitle?: string;
  totalMarks?: number;
  obtainedMarks?: number;
  percentage?: number;
  grade?: string;
  passFailStatus?: "Passed" | "Failed" | "Promoted" | "Pending";
  rank?: number;
  categoryRank?: number;
  awardStatus?: "Winner" | "1st Runner Up" | "2nd Runner Up" | "High Distinction" | "Distinction" | "Participated";
  subjectScores?: SubjectScore[];
  remarks?: string;
  verifiedAt?: string;
}

export interface CenterColumnMappings {
  studentName: string; // Column header for Student Name (required)
  fatherName?: string; // Optional: Father / Guardian Name
  classOrSection?: string; // Optional: Class
  schoolName?: string; // Optional: School / Institution
  tehsil?: string; // Optional: Tehsil
  totalMarks?: string; // Optional: Total Marks
  obtainedMarks: string; // Column header for Obtained Marks (required)
  level?: string; // Optional: Level (Level 1, Level 2, Level 3)
  rollNumber?: string; // Optional: Roll Number
}

export interface CenterSheetConnection {
  centerId: CenterId | string;
  centerName: string;
  spreadsheetUrl: string;
  spreadsheetId: string;
  worksheetName: string;
  headerRowIndex: number; // 1-based row number for headings (default: 1)
  status: "connected" | "disconnected" | "error" | "testing" | "pending";
  lastTestedAt: string | null;
  lastSyncedAt: string | null;
  lastError?: string;
  columnMappings: CenterColumnMappings;
  availableWorksheets?: string[];
  detectedHeaders?: string[];
}

export interface CategoryColumnMappings {
  rollNumber: string; // Column header or letter for Roll No (required)
  studentName: string; // Column header or letter for Student Name (required)
  fatherName?: string; // Optional: Father / Guardian Name
  schoolName?: string; // Optional: School / Institution
  district?: string; // Optional: District (e.g. Gilgit, Skardu)
  tehsil?: string; // Optional: Tehsil
  level?: string; // Optional: Competition Level
  classOrSection?: string; // Optional: Class or Section
  obtainedMarks: string; // Column header for Obtained Marks (required)
  totalMarks?: string; // Optional: Total Marks column
  percentage?: string; // Optional: Percentage column
  grade?: string; // Optional: Grade column
  passFailStatus?: string; // Optional: Status column
  rank?: string; // Optional: Position / Rank column
  subjectColumns?: { name: string; column: string }[]; // Optional: Subject-specific score columns
}

export interface CategorySheetConnection {
  categoryId: CategoryId;
  categoryTitle: string;
  spreadsheetUrl: string;
  spreadsheetId: string;
  worksheetName: string;
  headerRowIndex: number; // 1-based row number for headings (default: 1)
  status: "connected" | "disconnected" | "error" | "testing" | "pending";
  lastTestedAt: string | null;
  lastSyncedAt: string | null;
  lastError?: string;
  columnMappings: CategoryColumnMappings;
  availableWorksheets?: string[];
  detectedHeaders?: string[];
}

export interface CenterSheetsStore {
  version: string;
  updatedAt: string;
  serviceAccountConfigured: boolean;
  serviceAccountEmail?: string;
  centers: Record<string, CenterSheetConnection>;
}

export interface CategorySheetsStore {
  version: string;
  updatedAt: string;
  serviceAccountConfigured: boolean;
  serviceAccountEmail?: string;
  primarySpreadsheetId?: string;
  primarySpreadsheetUrl?: string;
  categories: Record<CategoryId, CategorySheetConnection>;
  centers?: Record<string, CenterSheetConnection>;
}

export interface SheetPreviewRow {
  rowIndex: number;
  values: Record<string, string>;
}

export interface SheetPreviewData {
  spreadsheetId: string;
  worksheetName: string;
  availableWorksheets: string[];
  headers: string[];
  sampleRows: SheetPreviewRow[];
  totalRowsEstimate?: number;
  suggestedMappings: Partial<CategoryColumnMappings>;
  detectedColumns?: {
    rollNumber?: string;
    studentName?: string;
    fatherName?: string;
    obtainedMarks?: string;
    totalMarks?: string;
  };
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  preview?: SheetPreviewData;
  errorDetails?: {
    code?: string | number;
    reason?: string;
    suggestedAction?: string;
  };
}

export interface SheetConnectionConfig {
  sheetId: string;
  sheetUrl: string;
  apiKeyConfigured: boolean;
  serviceAccountConfigured: boolean;
  selectedRange: string;
  autoSyncIntervalMinutes: number;
  lastSyncedAt: string | null;
  syncStatus: "connected" | "disconnected" | "error" | "pending";
  errorMessage?: string;
  sheetMappings: {
    rollNumberCol: string;
    studentNameCol: string;
    schoolNameCol: string;
    categoryCol: string;
    marksCol: string;
    totalMarksCol: string;
    rankCol: string;
  };
}

export interface SocialLinksConfig {
  facebook?: string;
  whatsapp?: string;
  youtube?: string;
  instagram?: string;
  linkedin?: string;
  email?: string;
  phone?: string;
  customLinks?: { label: string; url: string }[];
}

export interface CountdownConfig {
  enabled: boolean;
  targetDate: string; // ISO 8601 with timezone, e.g. "2026-10-25T11:30:00+05:00"
  organization: string; // "Triple E Organization Gilgit-Baltistan"
  eventTitle: string; // "Taqreeb-e-Taqseem Inaamaat wa Taleemi Seminar"
  competitionName: string; // "Al Ghanche General Knowledge Quiz Competition 2026"
  announcementDateDisplay: string; // "25 October 2026, Sunday, at 11:30 AM"
  venue: string; // "Government Boys High School Khaplu"
}

export interface WebsiteBrandingConfig {
  organizationName: string;
  organizationTagline: string;
  organizationRegion: string;
  motto: string;
  competitionTitle: string;
  competitionEdition: string;
  mainHeadline: string;
  mainSubtitle: string;
  competitionDescription: string;
  logoUrl: string;
  heroImageUrl: string;
  announcementText: string;
  announcementActive: boolean;
  resultsPublished: boolean;
  countdown?: CountdownConfig;
  resultsNotice: string;
  footerText: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  headquartersAddress: string;
  socialLinks: SocialLinksConfig;
  lookupLabels: {
    searchTitle: string;
    searchSubtitle: string;
    inputPlaceholder: string;
    buttonText: string;
  };
  resultCardLabels: {
    scorecardTitle: string;
    controllerTitle: string;
    remarksTitle: string;
  };
  fieldVisibility: {
    showFatherName: boolean;
    showSchoolName: boolean;
    showDistrict: boolean;
    showClassOrSection: boolean;
    showRank: boolean;
    showGrade: boolean;
    showPassFailStatus: boolean;
    showSubjectBreakdown: boolean;
  };
  partnerAttribution: {
    enabled: boolean;
    partnerName: string;
    partnerRole: string;
    partnerLogoUrl: string;
    partnerWebsiteUrl: string;
    tagline?: string;
    location?: string;
    developerCredit?: string;
  };
}

export interface CompetitionRule {
  id: string;
  title: string;
  detail: string;
  iconName: string;
}

export interface AdminAccount {
  email: string;
  passwordHash: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  sessionToken?: string;
  sessionExpiresAt?: string;
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  category?: string;
  details: string;
}
