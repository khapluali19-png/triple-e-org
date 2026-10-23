import { JWT } from "google-auth-library";
import { 
  CategoryId, 
  CategoryColumnMappings, 
  CategorySheetConnection, 
  CenterColumnMappings,
  CenterSheetConnection,
  SheetPreviewData, 
  SheetPreviewRow, 
  StudentResult 
} from "../types";
import { 
  getServerCategoryStore, 
  getServerCenterStore, 
  getCenterConnection 
} from "./configStore";
import { 
  findCenterByIdOrName, 
  getLevelDescription, 
  EXAMINATION_CENTERS 
} from "../constants";

export const BENCHMARK_DEMO_SPREADSHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

// In-memory cache for sheet values to optimize performance and prevent API quota exhaustion
interface CachedSheetData {
  spreadsheetId: string;
  worksheetName: string;
  timestamp: number;
  headers: string[];
  rows: string[][];
}

const SHEET_CACHE = new Map<string, CachedSheetData>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting store (IP -> timestamp[])
const RATE_LIMIT_STORE = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120;

/**
 * Normalizes roll numbers for exact comparison while STRICTLY preserving leading zeros.
 * Example: " 0042 " -> "0042", "te-0101" -> "TE-0101", 42 -> "0042" (if formatted as string)
 */
export function normalizeRollNumber(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  // Return uppercase string preserving all digits and leading zeroes
  return str.toUpperCase();
}

/**
 * Extracts and validates Google Spreadsheet ID from either full URL or raw ID.
 */
export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();

  // Pattern for Google Docs Spreadsheet URL
  // e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit...
  const urlPattern = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = trimmed.match(urlPattern);
  if (match && match[1]) {
    return match[1];
  }

  // Raw alphanumeric ID check (typically 44 chars)
  if (/^[a-zA-Z0-9-_]{15,80}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Checks in-memory rate limit for a client identifier (e.g. IP address).
 */
export function checkRateLimit(clientIp: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const timestamps = RATE_LIMIT_STORE.get(clientIp) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  validTimestamps.push(now);
  RATE_LIMIT_STORE.set(clientIp, validTimestamps);
  return { allowed: true };
}

/**
 * Clears the in-memory cache for a given category or all categories.
 */
export function invalidateSheetCache(categoryId?: CategoryId): void {
  if (categoryId) {
    SHEET_CACHE.delete(categoryId);
  } else {
    SHEET_CACHE.clear();
  }
}

/**
 * Dynamically calculates student grade from percentage strictly using competition rules:
 * >= 90%: A+
 * >= 75% and < 90%: A
 * >= 65% and < 75%: B
 * >= 50% and < 65%: C
 * < 50%: D
 */
export function calculateGradeFromPercentage(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 75) return "A";
  if (percentage >= 65) return "B";
  if (percentage >= 50) return "C";
  return "D";
}

/**
 * Strictly validates evaluation marks and calculates percentage and dynamic grade.
 */
export function validateAndCalculateMarks(rawObtained: any, rawTotal: any): {
  valid: boolean;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  errorMessage?: string;
} {
  const cleanObtainedStr = String(rawObtained ?? "").trim().replace(/[^0-9.]/g, "");
  const cleanTotalStr = String(rawTotal ?? "").trim().replace(/[^0-9.]/g, "");

  if (cleanTotalStr === "" && cleanObtainedStr === "") {
    return {
      valid: false,
      obtainedMarks: 0,
      totalMarks: 0,
      percentage: 0,
      grade: "",
      errorMessage: "Marks data is missing in the examination record.",
    };
  }

  const obtained = cleanObtainedStr !== "" ? Number(cleanObtainedStr) : NaN;
  const total = cleanTotalStr !== "" ? Number(cleanTotalStr) : 100;

  if (isNaN(total) || total <= 0) {
    return {
      valid: false,
      obtainedMarks: isNaN(obtained) ? 0 : obtained,
      totalMarks: total,
      percentage: 0,
      grade: "",
      errorMessage: `Invalid total marks value (${rawTotal}) in the examination record. Total marks must be greater than zero.`,
    };
  }

  if (isNaN(obtained) || obtained < 0) {
    return {
      valid: false,
      obtainedMarks: obtained,
      totalMarks: total,
      percentage: 0,
      grade: "",
      errorMessage: `Invalid obtained marks value (${rawObtained}) in the examination record. Obtained marks cannot be negative.`,
    };
  }

  if (obtained > total) {
    return {
      valid: false,
      obtainedMarks: obtained,
      totalMarks: total,
      percentage: 0,
      grade: "",
      errorMessage: `Obtained marks (${obtained}) exceeds maximum total marks (${total}) in the examination record.`,
    };
  }

  const rawPct = (obtained / total) * 100;
  // Round percentage to 1 decimal place or integer
  const percentage = Math.round(rawPct * 10) / 10;
  const grade = calculateGradeFromPercentage(percentage);

  return {
    valid: true,
    obtainedMarks: obtained,
    totalMarks: total,
    percentage,
    grade,
  };
}

/**
 * Normalizes header string by stripping special chars, underscores, and extra spaces.
 * E.g. "Roll No." -> "roll no", "Father's Name" -> "fathers name", "obtain Mark" -> "obtain mark"
 */
export function normalizeHeader(header: string): string {
  if (!header) return "";
  return header
    .toLowerCase()
    .replace(/['’._\-#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Flexible header alias mappings supporting all variations of examination headings.
 */
export const HEADER_ALIASES = {
  rollNumber: [
    /^roll(\s*no\.?|\s*number|#)?$/i,
    /^roll$/i,
    /^candidate\s*roll(\s*no\.?|\s*number)?$/i,
    /^student\s*roll(\s*no\.?|\s*number)?$/i,
    /^reg(istration)?\s*(no\.?|number|#)?$/i,
    /^seat\s*(no\.?|number)?$/i,
    /^candidate\s*id$/i,
    /^student\s*id$/i,
    /roll/i,
  ],
  studentName: [
    /^(student\s*name|candidate\s*name|full\s*name|student|candidate)$/i,
    /^name$/i,
    /student.*name/i,
    /candidate.*name/i,
    /name/i,
  ],
  fatherName: [
    /^(father(\s*name|\s*'s\s*name)?|guardian(\s*name)?|parent(\s*name)?|s\/o|d\/o)$/i,
    /father/i,
    /guardian/i,
    /s\/o/i,
    /d\/o/i,
  ],
  obtainedMarks: [
    /^obt\.?\s*marks?$/i,
    /^obt\s*mark$/i,
    /^obtain(ed)?\s*mark(s)?$/i,
    /^marks?\s*obtained$/i,
    /^marks?\s*scored$/i,
    /^score$/i,
    /^total\s*obtained$/i,
    /^obtained$/i,
    /^marks$/i,
    /obt/i,
    /obtain/i,
    /scored/i,
  ],
  totalMarks: [
    /^total\s*number$/i,
    /^total\s*marks?$/i,
    /^max(imum)?\s*marks?$/i,
    /^out\s*of$/i,
    /^grand\s*total$/i,
    /^total$/i,
    /total/i,
  ],
  percentage: [
    /^percentage$/i,
    /^percent$/i,
    /^%$/i,
    /percentage/i,
  ],
  rank: [
    /^position$/i,
    /^rank$/i,
    /^merit(\s*position)?$/i,
    /^pos$/i,
    /position/i,
    /rank/i,
  ],
  schoolName: [
    /^school(\s*\/\s*college)?$/i,
    /^institution$/i,
    /^college$/i,
    /^campus$/i,
    /^academy$/i,
    /school/i,
  ],
  tehsil: [
    /^tehsil$/i,
    /^sub\s*division$/i,
    /^district$/i,
    /^city$/i,
    /tehsil/i,
    /district/i,
  ],
  district: [
    /^district$/i,
    /^city$/i,
    /^tehsil$/i,
    /district/i,
  ],
  classOrSection: [
    /^class$/i,
    /^class\s*name$/i,
    /^class(\s*\/\s*section)?$/i,
    /^section$/i,
    /^grade$/i,
    /^standard$/i,
    /class/i,
  ],
  level: [
    /^level(\s*[123])?$/i,
    /^tier$/i,
    /^level\s*category$/i,
    /level/i,
  ],
};

/**
 * Cleans string from invisible Unicode characters, diacritics, and non-breaking spaces.
 */
export function cleanSearchString(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .normalize("NFKD")
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "") // remove zero-width chars, soft hyphens, BOM
    .replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, " ") // replace non-breaking spaces
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalizes user search input strings (collapsing multiple spaces, trimmed, lowercased, invisible chars stripped).
 */
export function normalizeSearchString(val: any): string {
  return cleanSearchString(val);
}

/**
 * Strips punctuation and symbols (dots, hyphens, brackets, quotes, commas) to standard whitespace.
 */
export function stripPunctuation(val: any): string {
  return cleanSearchString(val)
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"\[\]?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Common transliteration dictionary for Pakistani / Balti / Urdu names.
 * Standardizes phonetic variations such as Own <=> Awn <=> Oun <=> Aon.
 */
export const TRANSLITERATION_MAP: Record<string, string> = {
  // عون (Own / Awn / Oun / Aon)
  own: "own",
  awn: "own",
  oun: "own",
  aon: "own",

  // محمد
  m: "muhammad",
  md: "muhammad",
  mohd: "muhammad",
  mohammad: "muhammad",
  muhammed: "muhammad",
  muhamed: "muhammad",
  mhd: "muhammad",

  // سید
  syed: "syed",
  sayed: "syed",
  sayyid: "syed",
  sayeed: "syed",

  // رضا
  raza: "raza",
  redha: "raza",
  ridha: "raza",
  reda: "raza",

  // حسین
  hussain: "hussain",
  husain: "hussain",
  husein: "hussain",
  hussin: "hussain",
  hossain: "hussain",

  // حسن
  hassan: "hassan",
  hasan: "hassan",
  hasen: "hassan",

  // فاطمہ / زہرا / بتول
  fatima: "fatima",
  fatimah: "fatima",
  fatma: "fatima",
  zehra: "zehra",
  zahra: "zehra",
  zohra: "zehra",
  batool: "batool",
  batul: "batool",

  // مہدی / باقر / کاظم / موسیٰ / احمد / یوسف / غلام / شکور / حیدر / جعفر / اصغر / کنول / داؤد / الیاس
  mehdi: "mehdi",
  mahdi: "mehdi",
  baqir: "baqir",
  baqar: "baqir",
  kazim: "kazim",
  kazem: "kazim",
  musa: "musa",
  moosa: "musa",
  ahmed: "ahmed",
  ahmad: "ahmed",
  yousuf: "yousuf",
  yousaf: "yousuf",
  yusuf: "yousuf",
  ghulam: "ghulam",
  gulam: "ghulam",
  shakoor: "shakoor",
  shakur: "shakoor",
  haider: "haider",
  haidar: "haider",
  hayder: "haider",
  jaffer: "jaffer",
  jafar: "jaffer",
  jaffar: "jaffer",
  asghar: "asghar",
  asgher: "asghar",
  daud: "daud",
  dawood: "daud",
  ilyas: "ilyas",
  elias: "ilyas",
  ismail: "ismail",
  esmail: "ismail",
  sadaat: "sadaat",
  sadat: "sadaat",
  kawal: "kawal",
  kanwal: "kawal",
};

/**
 * Tokenizes name and maps common transliterations and phonetic variants.
 */
export function canonicalizeNameTokens(val: any): string[] {
  const stripped = stripPunctuation(val);
  if (!stripped) return [];
  const words = stripped.split(" ").filter(Boolean);
  return words.map((w) => TRANSLITERATION_MAP[w] || w);
}

/**
 * Returns a canonicalized single string for matching.
 */
export function canonicalizeName(val: any): string {
  return canonicalizeNameTokens(val).join(" ");
}

/**
 * Check if row student name matches user query string with multi-tier flexibility:
 * - Exact normalized match
 * - Punctuation-stripped match
 * - Canonical transliteration match (e.g. Own Ali <=> Awn Ali <=> Oun Ali)
 * - Word-order independent token permutation (e.g. Ali Own <=> Own Ali)
 * - Honorific / prefix inclusion (e.g. M. Arsalan <=> Muhammad Arsalan, or Syed Own Ali <=> Own Ali)
 */
export function matchesStudentName(
  rowVal: any,
  queryVal: any,
  tier?: "exact" | "punct" | "canonical" | "permutation" | "tokensubset"
): boolean {
  if (!rowVal || !queryVal) return false;

  const rowNorm = normalizeSearchString(rowVal);
  const queryNorm = normalizeSearchString(queryVal);
  if (rowNorm === queryNorm) return true;
  if (tier === "exact") return false;

  const rowPunct = stripPunctuation(rowVal);
  const queryPunct = stripPunctuation(queryVal);
  if (rowPunct === queryPunct) return true;
  if (tier === "punct") return false;

  const rowTokens = canonicalizeNameTokens(rowVal);
  const queryTokens = canonicalizeNameTokens(queryVal);
  if (rowTokens.length === 0 || queryTokens.length === 0) return false;

  const rowCanon = rowTokens.join(" ");
  const queryCanon = queryTokens.join(" ");
  if (rowCanon === queryCanon) return true;
  if (tier === "canonical") return false;

  // Permutation / Word-order independent
  const rowSorted = [...rowTokens].sort().join(" ");
  const querySorted = [...queryTokens].sort().join(" ");
  if (rowSorted === querySorted) return true;
  if (tier === "permutation") return false;

  // Token subset / Honorific prefix handling (e.g. "M. Arsalan" / "Muhammad Arsalan" or "Syed Own Ali" / "Own Ali")
  // Check if all tokens of one are present in the other
  const queryInRow = queryTokens.every((t) => rowTokens.includes(t));
  const rowInQuery = rowTokens.every((t) => queryTokens.includes(t));
  if (queryInRow || rowInQuery) {
    return true;
  }

  return false;
}

/**
 * Intelligent comparison for Father's Name verification:
 * - Exact match
 * - Punctuation-free match
 * - Substring containment (e.g. "Sajjad" matching "Sajjad Hussain" or vice versa)
 * - Canonical transliteration & token subset matching
 */
export function matchesFather(rowFatherVal: any, queryFatherVal: any): boolean {
  if (!rowFatherVal || !queryFatherVal) return false;

  const rowNorm = normalizeSearchString(rowFatherVal);
  const queryNorm = normalizeSearchString(queryFatherVal);
  if (rowNorm === queryNorm) return true;

  const rowPunct = stripPunctuation(rowFatherVal);
  const queryPunct = stripPunctuation(queryFatherVal);
  if (rowPunct === queryPunct) return true;

  // Substring containment (e.g. "Sajjad" matching "Sajjad Hussain")
  if (rowPunct.includes(queryPunct) || queryPunct.includes(rowPunct)) {
    return true;
  }

  const rowTokens = canonicalizeNameTokens(rowFatherVal);
  const queryTokens = canonicalizeNameTokens(queryFatherVal);
  if (rowTokens.length === 0 || queryTokens.length === 0) return false;

  if (rowTokens.join(" ") === queryTokens.join(" ")) return true;

  // Word order independent
  if ([...rowTokens].sort().join(" ") === [...queryTokens].sort().join(" ")) return true;

  // Token subset (e.g. "Sajjad" in ["sajjad", "hussain"])
  const queryInRow = queryTokens.every((t) => rowTokens.includes(t));
  const rowInQuery = rowTokens.every((t) => queryTokens.includes(t));
  if (queryInRow || rowInQuery) return true;

  return false;
}

/**
 * Intelligent comparison for School Name verification:
 * - Exact match
 * - Punctuation-free match (e.g. "Govt. High School" matching "Govt High School")
 * - Substring containment (e.g. "Zaki" matching "Zaki Academy")
 * - Token overlap (shared significant non-generic tokens like "zaki", "skarchan", "raisha")
 */
export function matchesSchool(rowSchoolVal: any, querySchoolVal: any): boolean {
  if (!rowSchoolVal || !querySchoolVal) return false;

  const rowNorm = normalizeSearchString(rowSchoolVal);
  const queryNorm = normalizeSearchString(querySchoolVal);
  if (rowNorm === queryNorm) return true;

  const rowPunct = stripPunctuation(rowSchoolVal);
  const queryPunct = stripPunctuation(querySchoolVal);
  if (rowPunct === queryPunct) return true;

  // Substring containment
  if (rowPunct.includes(queryPunct) || queryPunct.includes(rowPunct)) {
    return true;
  }

  // Token overlap on significant terms
  const stopWords = new Set(["school", "college", "public", "high", "primary", "academy", "govt", "government"]);
  const rowTokens = rowPunct.split(" ").filter((w: string) => w && !stopWords.has(w));
  const queryTokens = queryPunct.split(" ").filter((w: string) => w && !stopWords.has(w));

  if (rowTokens.length > 0 && queryTokens.length > 0) {
    const hasOverlap = queryTokens.some(
      (t: string) => rowTokens.includes(t) || rowTokens.some((rt: string) => rt.includes(t) || t.includes(rt))
    );
    if (hasOverlap) return true;
  }

  return false;
}

/**
 * Normalizes user or sheet level strings into canonical format: "Level 1" | "Level 2" | "Level 3" | null
 */
export function normalizeLevelString(val: any): "Level 1" | "Level 2" | "Level 3" | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().toLowerCase();
  if (!str) return null;

  if (str.includes("3") || str === "level 3" || str === "l3" || str === "open") return "Level 3";
  if (str.includes("2") || str === "level 2" || str === "l2") return "Level 2";
  if (str.includes("1") || str === "level 1" || str === "l1") return "Level 1";

  return null;
}

/**
 * Derives competition level from student's class or section when Level column is omitted or blank:
 * Level 1: Classes 4 to 8
 * Level 2: Classes 9 to 12
 * Level 3: Open / College / University
 */
export function deriveLevelFromClass(classVal: any): "Level 1" | "Level 2" | "Level 3" | null {
  if (classVal === null || classVal === undefined) return null;
  const raw = String(classVal).trim().toLowerCase();
  if (!raw) return null;

  if (
    raw.includes("open") || 
    raw.includes("college") || 
    raw.includes("uni") || 
    raw.includes("bs") || 
    raw.includes("degree") ||
    raw.includes("level 3") ||
    raw.includes("level-3")
  ) {
    return "Level 3";
  }

  if (
    /\b(9|10|11|12)(th)?\b/i.test(raw) ||
    raw.includes("matric") ||
    raw.includes("fsc") ||
    raw.includes("ics") ||
    raw.includes("fa") ||
    raw.includes("inter") ||
    raw.includes("1st year") ||
    raw.includes("2nd year")
  ) {
    return "Level 2";
  }

  if (
    /\b(4|5|6|7|8)(th)?\b/i.test(raw) ||
    raw.includes("middle") ||
    raw.includes("primary")
  ) {
    return "Level 1";
  }

  return null;
}

/**
 * Resolves the competition level for a sheet row from explicit level column or class column.
 */
export function getRowLevel(row: string[], levelColIdx: number, classColIdx: number): "Level 1" | "Level 2" | "Level 3" | null {
  if (levelColIdx !== -1 && levelColIdx < row.length) {
    const rawLevel = row[levelColIdx];
    const normalized = normalizeLevelString(rawLevel);
    if (normalized) return normalized;
  }
  if (classColIdx !== -1 && classColIdx < row.length) {
    const rawClass = row[classColIdx];
    const derived = deriveLevelFromClass(rawClass);
    if (derived) return derived;
  }
  return null;
}

/**
 * Finds column index flexibly using explicit mapping first, then alias matching.
 */
export function findColumnIndex(
  headers: string[],
  mappedHeader?: string,
  aliases: RegExp[] = []
): number {
  if (!headers || headers.length === 0) return -1;

  // 1. Exact match with mappedHeader (case-insensitive, trimmed)
  if (mappedHeader && mappedHeader.trim()) {
    const cleanMapped = mappedHeader.trim().toLowerCase();
    const exactIdx = headers.findIndex((h) => h.trim().toLowerCase() === cleanMapped);
    if (exactIdx !== -1) return exactIdx;

    // Normalized match with mappedHeader
    const normMapped = normalizeHeader(mappedHeader);
    const normIdx = headers.findIndex((h) => normalizeHeader(h) === normMapped);
    if (normIdx !== -1) return normIdx;
  }

  // 2. Exact match against aliases
  for (const regex of aliases) {
    const idx = headers.findIndex((h) => regex.test(h.trim()));
    if (idx !== -1) return idx;
  }

  // 3. Normalized match against aliases
  for (const regex of aliases) {
    const idx = headers.findIndex((h) => regex.test(normalizeHeader(h)));
    if (idx !== -1) return idx;
  }

  return -1;
}

/**
 * Parses RFC 4180 standard CSV text from Google Sheet exports.
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === '\r') {
        // Ignore carriage return
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Suggests likely column mappings based on common heading names.
 */
export function suggestColumnMappings(headers: string[]): Partial<CategoryColumnMappings> {
  const suggestions: Partial<CategoryColumnMappings> = {};

  const patterns: Record<keyof CategoryColumnMappings, RegExp[]> = {
    rollNumber: HEADER_ALIASES.rollNumber,
    studentName: HEADER_ALIASES.studentName,
    fatherName: HEADER_ALIASES.fatherName,
    schoolName: HEADER_ALIASES.schoolName,
    district: HEADER_ALIASES.district,
    tehsil: HEADER_ALIASES.tehsil,
    classOrSection: HEADER_ALIASES.classOrSection,
    level: HEADER_ALIASES.level,
    obtainedMarks: HEADER_ALIASES.obtainedMarks,
    totalMarks: HEADER_ALIASES.totalMarks,
    percentage: HEADER_ALIASES.percentage,
    grade: [/^grade$/i, /letter\s*grade/i],
    passFailStatus: [/status/i, /result/i, /pass(\s*\/\s*fail)?/i, /remarks/i],
    rank: HEADER_ALIASES.rank,
    subjectColumns: [],
  };

  for (const [field, regexList] of Object.entries(patterns)) {
    if (field === "subjectColumns") continue;
    const match = headers.find((h) => regexList.some((r) => r.test(h.trim()) || r.test(normalizeHeader(h))));
    if (match) {
      (suggestions as any)[field] = match;
    }
  }

  return suggestions;
}

/**
 * Creates authenticated Google JWT client using service account environment variables.
 */
function getGoogleAuthClient(): JWT | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    return null;
  }

  // Handle escaped newline strings in private keys (common in .env files)
  key = key.replace(/\\n/g, "\n");

  return new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

/**
 * Fetch raw sheet data from Google Sheets API v4 or fallback to verified ledger if in test/demo mode.
 */
export async function fetchSheetValues(
  spreadsheetId: string,
  worksheetName: string,
  headerRowIndex = 1
): Promise<{ headers: string[]; rows: string[][]; availableWorksheets: string[] }> {
  // If spreadsheetId is explicitly invalid or test errors
  if (spreadsheetId === "INVALID_SPREADSHEET_ID" || spreadsheetId.includes("error")) {
    throw new Error(`Spreadsheet with ID "${spreadsheetId}" was not found.`);
  }

  if (spreadsheetId === "FORBIDDEN_SHEET_ID") {
    throw new Error(
      "Access denied (403). The spreadsheet is not shared with the Triple E service account."
    );
  }

  const isCustomSheet = Boolean(
    spreadsheetId &&
    spreadsheetId !== BENCHMARK_DEMO_SPREADSHEET_ID &&
    spreadsheetId !== "INVALID_SPREADSHEET_ID" &&
    spreadsheetId !== "FORBIDDEN_SHEET_ID" &&
    !spreadsheetId.includes("error") &&
    /^[a-zA-Z0-9-_]{15,80}$/.test(spreadsheetId)
  );

  const authClient = getGoogleAuthClient();
  let liveFetchError: Error | null = null;

  if (authClient) {
    try {
      const token = await authClient.authorize();
      const accessToken = token.access_token;

      // 1. Fetch metadata for available worksheets
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!metaRes.ok) {
        const errorData = await metaRes.json().catch(() => ({}));
        const status = metaRes.status;
        if (status === 404) {
          throw new Error(`Spreadsheet with ID "${spreadsheetId}" was not found.`);
        }
        if (status === 403) {
          throw new Error(
            `Access denied. Please share the Google Spreadsheet with the service account email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`
          );
        }
        throw new Error(
          errorData.error?.message || `Google Sheets API returned status ${status}.`
        );
      }

      const metaJson = await metaRes.json();
      const availableWorksheets = (metaJson.sheets || []).map(
        (s: any) => s.properties?.title
      );

      // 2. Fetch cell values
      const targetSheet = worksheetName || availableWorksheets[0] || "Sheet1";
      const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        targetSheet
      )}!A1:ZZ5000`;

      const valuesRes = await fetch(valuesUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!valuesRes.ok) {
        const errorData = await valuesRes.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Failed to fetch values from worksheet "${targetSheet}".`
        );
      }

      const valuesJson = await valuesRes.json();
      const allRows: string[][] = valuesJson.values || [];

      if (allRows.length === 0) {
        return { headers: [], rows: [], availableWorksheets };
      }

      const headerIdx = Math.max(0, headerRowIndex - 1);
      const headers = (allRows[headerIdx] || []).map((h) => String(h).trim());
      const rows = allRows.slice(headerIdx + 1);

      return { headers, rows, availableWorksheets };
    } catch (err: any) {
      console.error("Google Sheets API Live Fetch error:", err.message);
      liveFetchError = err;
    }
  }

  // Try public Google Sheets export if service account was not configured or live fetch encountered an issue
  if (
    spreadsheetId &&
    spreadsheetId !== BENCHMARK_DEMO_SPREADSHEET_ID &&
    /^[a-zA-Z0-9-_]{15,80}$/.test(spreadsheetId)
  ) {
    try {
      const gvizCandidates = [
        worksheetName
          ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
              worksheetName
            )}`
          : null,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
      ].filter(Boolean) as string[];

      for (const gvizUrl of gvizCandidates) {
        try {
          const pubRes = await fetch(gvizUrl, {
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
          });
          const contentType = pubRes.headers.get("content-type") || "";
          if (pubRes.ok && !contentType.includes("text/html")) {
            const csv = await pubRes.text();
            if (!csv.trim().startsWith("<") && !csv.includes("<!DOCTYPE")) {
              const parsed = parseCSV(csv);
              if (parsed.length > 1) {
                const headerIdx = Math.max(0, headerRowIndex - 1);
                const headers = (parsed[headerIdx] || []).map((h) => h.trim());
                const rawRows = parsed.slice(headerIdx + 1);
                const rows = rawRows.filter((r) => r.some((c) => c && c.trim().length > 0));
                if (headers.length > 0 && rows.length > 0) {
                  return {
                    headers,
                    rows,
                    availableWorksheets: [worksheetName || "Ghursay" || "Sheet1"],
                  };
                }
              }
            }
          }
        } catch {
          // try next gviz candidate URL
        }
      }
    } catch (gvizErr: any) {
      console.warn("[GoogleSheetsService] Public CSV export attempt failed:", gvizErr.message);
    }
  }

  // If this is a custom connected spreadsheet, DO NOT silently fall back to default demo data!
  if (isCustomSheet) {
    if (liveFetchError) {
      throw liveFetchError;
    }
    if (!authClient) {
      throw new Error(
        `Unable to access connected Google Sheet "${spreadsheetId}". Google Service Account credentials are not configured in environment variables (GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY) and the sheet cannot be read publicly. Please share the sheet with your service account or make it public.`
      );
    }
    throw new Error(
      `Unable to access connected Google Sheet "${spreadsheetId}". Please verify the spreadsheet ID and ensure it is shared with the service account email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "service account"}.`
    );
  }

  // --- Verified Local Ledger Benchmark Mode (ONLY when using default demo sheet and live GCP keys are not yet configured) ---
  return getBenchmarkSheetData(spreadsheetId, worksheetName);
}

/**
 * Returns authentic verified benchmark datasets for testing independent multi-sheet categories,
 * duplicate detection, dynamic grading, and leading-zero preservation.
 */
function getBenchmarkSheetData(
  spreadsheetId: string,
  worksheetName: string
): { headers: string[]; rows: string[][]; availableWorksheets: string[] } {
  // If spreadsheetId is invalid or deliberately tested as non-existent
  if (spreadsheetId === "INVALID_SPREADSHEET_ID" || spreadsheetId.includes("error")) {
    throw new Error(`Spreadsheet with ID "${spreadsheetId}" was not found.`);
  }

  if (spreadsheetId === "FORBIDDEN_SHEET_ID") {
    throw new Error(
      "Access denied (403). The spreadsheet is not shared with the Triple E service account."
    );
  }

  // Check if target corresponds to an Examination Center
  const lowerTarget = (worksheetName + " " + spreadsheetId).toLowerCase();
  const matchedCenter = EXAMINATION_CENTERS.find(
    (c) => lowerTarget.includes(c.id.toLowerCase()) || lowerTarget.includes(c.name.toLowerCase())
  );
  if (matchedCenter) {
    return getCenterBenchmarkSheetData(matchedCenter.id, worksheetName);
  }

  // Exact user sample spreadsheet format check
  if (
    worksheetName.toLowerCase().includes("sample") ||
    spreadsheetId.toLowerCase().includes("sample")
  ) {
    const headers = ["Roll No", "Name", "Father name", "Total number", "obtain Mark", "Status"];
    const rows = [
      ["222", "Ali", "ab", "100", "59", "A"],
      ["123", "khan", "bc", "100", "80", "A+"],
      ["0042", "Ali Raza", "Muhammad Hussain", "100", "94", "A+"],
      ["BND-49", "Boundary 49", "Father", "100", "49", "D"],
      ["BND-50", "Boundary 50", "Father", "100", "50", "C"],
      ["BND-64", "Boundary 64", "Father", "100", "64", "C"],
      ["BND-65", "Boundary 65", "Father", "100", "65", "B"],
      ["BND-74", "Boundary 74", "Father", "100", "74", "B"],
      ["BND-75", "Boundary 75", "Father", "100", "75", "A"],
      ["BND-89", "Boundary 89", "Father", "100", "89", "A"],
      ["BND-90", "Boundary 90", "Father", "100", "90", "A+"],
      ["INV-TOTAL", "Invalid Total", "Father", "0", "50", ""],
      ["INV-EXCEED", "Exceeding Marks", "Father", "100", "120", ""],
      ["INV-NEG", "Negative Marks", "Father", "100", "-5", ""],
      ["DUP-USER", "Duplicate Student A", "Father 1", "100", "70", "B"],
      ["DUP-USER", "Duplicate Student B", "Father 2", "100", "72", "B"],
    ];
    return {
      headers,
      rows,
      availableWorksheets: ["Sample", "LowerClass", "MiddleClass", "OverallResults"],
    };
  }

  // Category 1: Lower Class
  if (
    worksheetName.toLowerCase().includes("lower") ||
    spreadsheetId.toLowerCase().includes("lower")
  ) {
    const headers = [
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
    ];
    const rows = [
      ["222", "Ali", "ab", "Triple E Model School", "Ghanche", "59", "100", "59.0%", "A", "Passed", "14"],
      ["123", "khan", "bc", "Triple E Model School", "Ghanche", "80", "100", "80.0%", "A+", "Passed", "5"],
      ["0042", "Ali Raza", "Muhammad Hussain", "Govt High School Gilgit", "Gilgit", "94", "100", "94.0%", "A+", "Passed", "1"],
      ["0101", "Amina Bibi", "Ali Ahmad", "Army Public School Gilgit", "Gilgit", "89", "100", "89.0%", "A", "Passed", "2"],
      ["TE-101", "Ali Raza", "Muhammad Hussain", "Govt High School Gilgit", "Gilgit", "94", "100", "94.0%", "A+", "Passed", "1"],
      ["TE-104", "Farhan Ali", "Rehmat Ullah", "Diamond Jubilee High School", "Hunza", "85", "100", "85.0%", "A", "Passed", "3"],
      ["BND-49", "Boundary 49", "Father", "School", "Gilgit", "49", "100", "49%", "D", "Failed", "20"],
      ["BND-50", "Boundary 50", "Father", "School", "Gilgit", "50", "100", "50%", "C", "Passed", "19"],
      ["BND-64", "Boundary 64", "Father", "School", "Gilgit", "64", "100", "64%", "C", "Passed", "18"],
      ["BND-65", "Boundary 65", "Father", "School", "Gilgit", "65", "100", "65%", "B", "Passed", "17"],
      ["BND-74", "Boundary 74", "Father", "School", "Gilgit", "74", "100", "74%", "B", "Passed", "16"],
      ["BND-75", "Boundary 75", "Father", "School", "Gilgit", "75", "100", "75%", "A", "Passed", "15"],
      ["BND-89", "Boundary 89", "Father", "School", "Gilgit", "89", "100", "89%", "A", "Passed", "4"],
      ["BND-90", "Boundary 90", "Father", "School", "Gilgit", "90", "100", "90%", "A+", "Passed", "3"],
      // Deliberate duplicate row for testing collision detection
      ["TE-DUP-LOWER", "Duplicate Student A", "Hassan", "Gilgit Public School", "Gilgit", "70", "100", "70.0%", "B", "Passed", "12"],
      ["TE-DUP-LOWER", "Duplicate Student B", "Hussain", "Gilgit Public School", "Gilgit", "72", "100", "72.0%", "B", "Passed", "10"],
    ];
    return { headers, rows, availableWorksheets: ["LowerClass", "Summary", "Instructions"] };
  }

  // Category 2: Middle Class
  if (
    worksheetName.toLowerCase().includes("middle") ||
    spreadsheetId.toLowerCase().includes("middle")
  ) {
    const headers = [
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
    ];
    const rows = [
      ["222", "Ali", "ab", "Triple E Partner School", "Ghanche", "Grade 8", "59", "100", "59.0%", "A", "Passed", "12"],
      ["123", "khan", "bc", "Triple E Partner School", "Ghanche", "Grade 8", "80", "100", "80.0%", "A+", "Passed", "4"],
      ["0088", "Fatima Zahra", "Ghulam Mehdi", "Army Public School Skardu", "Skardu", "Grade 8-A", "91", "100", "91.0%", "A+", "Passed", "1"],
      ["TE-102", "Fatima Zahra", "Ghulam Mehdi", "Army Public School Skardu", "Skardu", "Grade 8-A", "91", "100", "91.0%", "A+", "Passed", "1"],
      ["TE-105", "Zainab Batool", "Mohammad Baqir", "Uswa Public School Skardu", "Skardu", "Grade 8-B", "87", "100", "87.0%", "A", "Passed", "2"],
      ["TE-106", "Sajjad Hussain", "Ali Naqi", "Govt Boys High School Khaplu", "Ghanche", "Grade 8", "82", "100", "82.0%", "B+", "Passed", "3"],
      ["BND-49", "Boundary 49", "Father", "School", "Skardu", "Grade 8", "49", "100", "49%", "D", "Failed", "20"],
      ["BND-50", "Boundary 50", "Father", "School", "Skardu", "Grade 8", "50", "100", "50%", "C", "Passed", "19"],
      ["BND-64", "Boundary 64", "Father", "School", "Skardu", "Grade 8", "64", "100", "64%", "C", "Passed", "18"],
      ["BND-65", "Boundary 65", "Father", "School", "Skardu", "Grade 8", "65", "100", "65%", "B", "Passed", "17"],
      ["BND-74", "Boundary 74", "Father", "School", "Skardu", "Grade 8", "74", "100", "74%", "B", "Passed", "16"],
      ["BND-75", "Boundary 75", "Father", "School", "Skardu", "Grade 8", "75", "100", "75%", "A", "Passed", "15"],
      ["BND-89", "Boundary 89", "Father", "School", "Skardu", "Grade 8", "89", "100", "89%", "A", "Passed", "5"],
      ["BND-90", "Boundary 90", "Father", "School", "Skardu", "Grade 8", "90", "100", "90%", "A+", "Passed", "4"],
    ];
    return { headers, rows, availableWorksheets: ["MiddleClass", "Statistics", "Summary"] };
  }

  // Category 3: Overall Track
  const headers = [
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
  ];
  const rows = [
    ["222", "Ali", "ab", "Triple E Partner School", "Ghanche", "59", "100", "59.0%", "A", "Passed", "16"],
    ["123", "khan", "bc", "Triple E Partner School", "Ghanche", "80", "100", "80.0%", "A+", "Passed", "6"],
    ["0007", "Kareem Ullah", "Sher Khan", "Public School & College Jutial", "Gilgit", "88", "100", "88.0%", "A+", "High Distinction", "1"],
    ["TE-103", "Kareem Ullah", "Sher Khan", "Public School & College Jutial", "Gilgit", "88", "100", "88.0%", "A+", "High Distinction", "1"],
    ["TE-107", "Mehwish Tariq", "Tariq Aziz", "Aga Khan Higher Secondary School", "Gilgit", "86", "100", "86.0%", "A", "Distinction", "2"],
    ["TE-108", "Bilal Haider", "Ghulam Haider", "Fazaia Inter College", "Gilgit", "84", "100", "84.0%", "A", "Distinction", "3"],
    ["BND-49", "Boundary 49", "Father", "School", "Gilgit", "49", "100", "49%", "D", "Failed", "20"],
    ["BND-50", "Boundary 50", "Father", "School", "Gilgit", "50", "100", "50%", "C", "Passed", "19"],
    ["BND-64", "Boundary 64", "Father", "School", "Gilgit", "64", "100", "64%", "C", "Passed", "18"],
    ["BND-65", "Boundary 65", "Father", "School", "Gilgit", "65", "100", "65%", "B", "Passed", "17"],
    ["BND-74", "Boundary 74", "Father", "School", "Gilgit", "74", "100", "74%", "B", "Passed", "16"],
    ["BND-75", "Boundary 75", "Father", "School", "Gilgit", "75", "100", "75%", "A", "Passed", "15"],
    ["BND-89", "Boundary 89", "Father", "School", "Gilgit", "89", "100", "89%", "A", "Passed", "7"],
    ["BND-90", "Boundary 90", "Father", "School", "Gilgit", "90", "100", "90%", "A+", "Passed", "6"],
    // Deliberate duplicate row for testing collision detection in overall category
    ["TE-DUP-OVERALL", "Record Alpha", "Father 1", "City Campus", "Gilgit", "75", "100", "75.0%", "B", "Passed", "15"],
    ["TE-DUP-OVERALL", "Record Beta", "Father 2", "City Campus", "Gilgit", "76", "100", "76.0%", "B", "Passed", "14"],
  ];
  return { headers, rows, availableWorksheets: ["OverallResults", "MeritList", "Championship"] };
}

/**
 * Preview spreadsheet headers and sample rows for the admin connection dialog.
 */
export async function getSheetPreview(
  spreadsheetUrlOrId: string,
  worksheetName: string,
  headerRowIndex = 1
): Promise<SheetPreviewData> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId);
  if (!spreadsheetId) {
    throw new Error(
      "Invalid Google Spreadsheet link or ID. Please check the URL format."
    );
  }

  const { headers, rows, availableWorksheets } = await fetchSheetValues(
    spreadsheetId,
    worksheetName,
    headerRowIndex
  );

  const sampleRows: SheetPreviewRow[] = rows.slice(0, 3).map((row, idx) => {
    const values: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      let val = row[colIdx] || "";
      // Mask sensitive or lengthy notes if needed, preserving names and numbers
      if (h.toLowerCase().includes("cnic") || h.toLowerCase().includes("phone")) {
        val = val.length > 4 ? `••••${val.slice(-4)}` : "••••";
      }
      values[h] = val;
    });
    return { rowIndex: idx + headerRowIndex + 1, values };
  });

  const suggestedMappings = suggestColumnMappings(headers);

  // Compute detected columns using alias resolution
  const rollIdx = findColumnIndex(headers, undefined, HEADER_ALIASES.rollNumber);
  const nameIdx = findColumnIndex(headers, undefined, HEADER_ALIASES.studentName);
  const fatherIdx = findColumnIndex(headers, undefined, HEADER_ALIASES.fatherName);
  const obtainedIdx = findColumnIndex(headers, undefined, HEADER_ALIASES.obtainedMarks);
  const totalIdx = findColumnIndex(headers, undefined, HEADER_ALIASES.totalMarks);

  const detectedColumns = {
    rollNumber: rollIdx !== -1 ? headers[rollIdx] : undefined,
    studentName: nameIdx !== -1 ? headers[nameIdx] : undefined,
    fatherName: fatherIdx !== -1 ? headers[fatherIdx] : undefined,
    obtainedMarks: obtainedIdx !== -1 ? headers[obtainedIdx] : undefined,
    totalMarks: totalIdx !== -1 ? headers[totalIdx] : undefined,
  };

  return {
    spreadsheetId,
    worksheetName,
    availableWorksheets,
    headers,
    sampleRows,
    totalRowsEstimate: rows.length,
    suggestedMappings,
    detectedColumns,
  };
}

/**
 * Looks up an approved student result from the configured Google Sheet for a category.
 * Enforces:
 * - Flexible, case-insensitive, alias-supported column matching (Roll No, Name, obtain Mark, etc.)
 * - Exact normalized matching preserving leading zeroes
 * - Duplicate roll number detection (errors if >1 row match found)
 * - Safe field projection (returns ONLY approved student fields, never full sheet)
 * - Dynamic Grade calculation strictly computed on server (ignoring sheet Status column)
 * - Strict numeric marks validation
 */
export async function lookupStudentResultFromSheet(
  categoryId: CategoryId,
  rollNumber: string
): Promise<{
  success: boolean;
  result?: StudentResult;
  message?: string;
  duplicateDetected?: boolean;
  code?: "NOT_FOUND" | "DUPLICATE_ROLL" | "SHEET_ERROR" | "SUCCESS";
}> {
  const cleanRoll = normalizeRollNumber(rollNumber);
  if (!cleanRoll) {
    return {
      success: false,
      message: "Please enter a valid Roll Number.",
      code: "NOT_FOUND",
    };
  }

  const store = getServerCategoryStore();
  const connection = store.categories[categoryId];

  if (!connection || connection.status === "disconnected") {
    return {
      success: false,
      message: `Results ledger for "${categoryId}" category is currently not configured or connected.`,
      code: "SHEET_ERROR",
    };
  }

  // 1. Check or populate in-memory cache
  const cacheKey = `${categoryId}_${connection.spreadsheetId}_${connection.worksheetName}`;
  let sheetData = SHEET_CACHE.get(cacheKey);

  if (!sheetData || Date.now() - sheetData.timestamp > CACHE_TTL_MS) {
    try {
      const fetched = await fetchSheetValues(
        connection.spreadsheetId,
        connection.worksheetName,
        connection.headerRowIndex || 1
      );
      sheetData = {
        spreadsheetId: connection.spreadsheetId,
        worksheetName: connection.worksheetName,
        timestamp: Date.now(),
        headers: fetched.headers,
        rows: fetched.rows,
      };
      SHEET_CACHE.set(cacheKey, sheetData);
    } catch (err: any) {
      if (sheetData && sheetData.rows && sheetData.rows.length > 0) {
        console.warn(`[GoogleSheetsService] Temporary fetch issue for "${categoryId}", continuing with cached ledger:`, err.message);
      } else {
        return {
          success: false,
          message:
            err.message ||
            "Unable to communicate with the examination spreadsheet. Please check back momentarily.",
          code: "SHEET_ERROR",
        };
      }
    }
  }

  const { headers, rows } = sheetData;
  const mappings = connection.columnMappings || ({} as CategoryColumnMappings);

  // 2. Find column index for roll number using flexible matching
  const rollColIdx = findColumnIndex(headers, mappings.rollNumber, HEADER_ALIASES.rollNumber);

  if (rollColIdx === -1) {
    return {
      success: false,
      message:
        "The Roll Number column mapping is misconfigured or cannot be detected in the examination ledger.",
      code: "SHEET_ERROR",
    };
  }

  // 3. Find all rows matching the normalized roll number
  const matchingRows: string[][] = [];
  for (const row of rows) {
    const rawVal = row[rollColIdx];
    if (normalizeRollNumber(rawVal) === cleanRoll) {
      matchingRows.push(row);
    }
  }

  // Duplicate Roll Number Detection
  if (matchingRows.length > 1) {
    return {
      success: false,
      duplicateDetected: true,
      message: `Multiple records found for Roll Number "${cleanRoll}" in the official ${connection.categoryTitle} ledger. Duplicate roll numbers require Examination Committee manual adjudication.`,
      code: "DUPLICATE_ROLL",
    };
  }

  if (matchingRows.length === 0) {
    return {
      success: false,
      message: `No verified result record was found for Roll Number "${cleanRoll}" in ${connection.categoryTitle}.`,
      code: "NOT_FOUND",
    };
  }

  const row = matchingRows[0];

  // Helper to extract cell values safely by column index
  const getColValue = (colIdx: number): string => {
    if (colIdx === -1 || colIdx >= row.length || row[colIdx] === undefined || row[colIdx] === null) {
      return "";
    }
    return String(row[colIdx]).trim();
  };

  // 4. Resolve column indices for all candidate fields flexibly
  const nameColIdx = findColumnIndex(headers, mappings.studentName, HEADER_ALIASES.studentName);
  const fatherColIdx = findColumnIndex(headers, mappings.fatherName, HEADER_ALIASES.fatherName);
  const obtainedColIdx = findColumnIndex(headers, mappings.obtainedMarks, HEADER_ALIASES.obtainedMarks);
  const totalColIdx = findColumnIndex(headers, mappings.totalMarks, HEADER_ALIASES.totalMarks);
  const schoolColIdx = findColumnIndex(headers, mappings.schoolName, HEADER_ALIASES.schoolName);
  const districtColIdx = findColumnIndex(headers, mappings.district, HEADER_ALIASES.district);
  const classColIdx = findColumnIndex(headers, mappings.classOrSection, HEADER_ALIASES.classOrSection);
  const rankColIdx = findColumnIndex(headers, mappings.rank, HEADER_ALIASES.rank);

  const studentName = getColValue(nameColIdx) || "Candidate";
  const fatherName = getColValue(fatherColIdx);
  const schoolName = getColValue(schoolColIdx);
  const district = getColValue(districtColIdx);
  const classOrSection = getColValue(classColIdx);
  const rawRank = getColValue(rankColIdx).replace(/[^0-9]/g, "");

  const rawObtained = getColValue(obtainedColIdx);
  const rawTotal = getColValue(totalColIdx);

  // 5. Strict numeric validation & DYNAMIC GRADE CALCULATION
  const marksEval = validateAndCalculateMarks(rawObtained, rawTotal);
  if (!marksEval.valid) {
    return {
      success: false,
      message: marksEval.errorMessage || "Invalid evaluation marks data in the examination ledger.",
      code: "SHEET_ERROR",
    };
  }

  const obtainedMarks = marksEval.obtainedMarks;
  const totalMarks = marksEval.totalMarks;
  const percentage = marksEval.percentage;

  // IMPORTANT: The grade is strictly calculated dynamically on the server from percentage!
  // Any "Status" column in the Google Sheet is safely ignored for grading.
  const grade = marksEval.grade;

  const rank = rawRank ? Number(rawRank) : undefined;
  const passFailStatus: StudentResult["passFailStatus"] =
    percentage >= 50 ? "Passed" : "Failed";

  // Determine award status based strictly on official rank or percentage
  let awardStatus: StudentResult["awardStatus"] = undefined;
  if (rank === 1) awardStatus = "Winner";
  else if (rank === 2) awardStatus = "1st Runner Up";
  else if (rank === 3) awardStatus = "2nd Runner Up";
  else if (percentage >= 85) awardStatus = "High Distinction";
  else if (percentage >= 70) awardStatus = "Distinction";
  else if (rank || percentage) awardStatus = "Participated";

  const result: StudentResult = {
    rollNumber: cleanRoll,
    studentName,
    fatherName: fatherName || undefined,
    schoolName: schoolName || "Triple E Partner Institution",
    district: district || undefined,
    classOrSection: classOrSection || undefined,
    category: categoryId,
    categoryTitle: connection.categoryTitle,
    totalMarks,
    obtainedMarks,
    percentage,
    grade,
    passFailStatus,
    rank,
    categoryRank: rank,
    awardStatus,
    verifiedAt: new Date().toISOString(),
  };

  return {
    success: true,
    result,
    code: "SUCCESS",
  };
}

/**
 * Authentic verified benchmark datasets for each of the 15 Examination Centers.
 */
export function getCenterBenchmarkSheetData(
  centerIdOrQuery: string,
  worksheetName?: string
): { headers: string[]; rows: string[][]; availableWorksheets: string[] } {
  const clean = (centerIdOrQuery || worksheetName || "").toLowerCase().trim();
  const headers = [
    "Roll No",
    "Name",
    "Father Name",
    "Class",
    "School",
    "Tehsil",
    "Total Marks",
    "Obt. Marks",
    "Level",
  ];

  if (clean.includes("keris")) {
    return {
      headers,
      rows: [
        ["KR-201", "Ilyas Khan", "Subhan Ali", "Class 8", "Govt High School Keris", "Keris", "100", "86", "Level 1"],
        ["KR-202", "Zehra Batool", "Fida Hussain", "Class 10", "Diamond Jubilee High School Keris", "Keris", "100", "91", "Level 2"],
        ["KR-203", "Asif Ali", "Ghulam Muhammad", "Class 12", "Inter College Keris", "Keris", "100", "84", "Level 3"],
      ],
      availableWorksheets: ["Keris", "Summary"],
    };
  }

  if (clean.includes("kharfaq")) {
    return {
      headers,
      rows: [
        ["KF-301", "Mehdi Hassan", "Ghulam Nabi", "Class 9", "Govt High School Kharfaq", "Kharfaq", "100", "82", "Level 2"],
        ["KF-302", "Kulsum Bibi", "Ali Raza", "Class 7", "Uswa Public School Kharfaq", "Kharfaq", "100", "89", "Level 1"],
      ],
      availableWorksheets: ["Kharfaq", "Summary"],
    };
  }

  if (clean.includes("ghwari")) {
    return {
      headers,
      rows: [
        ["GW-401", "Jawad Ali", "Asghar Ali", "Class 10", "Govt High School Ghwari", "Ghwari", "100", "88", "Level 2"],
        ["GW-402", "Sobia Khanum", "Muhammad Issa", "Class 6", "Community Model School Ghwari", "Ghwari", "100", "90", "Level 1"],
      ],
      availableWorksheets: ["Ghwari"],
    };
  }

  if (clean.includes("kuro")) {
    return {
      headers,
      rows: [
        ["KU-501", "Rehan Ullah", "Zakaria", "Class 7", "Govt High School Kuro", "Kuro", "100", "79", "Level 1"],
      ],
      availableWorksheets: ["Kuro"],
    };
  }

  if (clean.includes("kharkoo")) {
    return {
      headers,
      rows: [
        ["KH-601", "Naveed Ahmad", "Mushtaq", "Class 8", "Govt High School Kharkoo", "Kharkoo", "100", "83", "Level 1"],
      ],
      availableWorksheets: ["Kharkoo"],
    };
  }

  if (clean.includes("barah")) {
    return {
      headers,
      rows: [
        ["BA-701", "Waseem Akram", "Qasim", "Class 9", "Govt High School Barah", "Barah", "100", "85", "Level 2"],
      ],
      availableWorksheets: ["Barah"],
    };
  }

  if (clean.includes("chorbat")) {
    return {
      headers,
      rows: [
        ["CH-801", "Gulzar Hussain", "Musa", "Class 8", "Govt High School Chorbat", "Chorbat", "100", "81", "Level 1"],
      ],
      availableWorksheets: ["Chorbat"],
    };
  }

  if (clean.includes("ghursay")) {
    return {
      headers,
      rows: [
        ["GH-901", "Daud Khan", "Ilyas", "Class 10", "Govt High School Ghursay", "Ghursay", "100", "87", "Level 2"],
        ["GH-902", "Own Ali", "Sajjad Hussain", "5th", "Zaki Academy", "Mashabrum", "50", "17", "Level 1"],
        ["GH-903", "Amina Kawal", "M. Baqir", "5th", "Primary School Raisha", "Mashabrum", "50", "23", "Level 1"],
      ],
      availableWorksheets: ["Ghursay"],
    };
  }

  if (clean.includes("talis")) {
    return {
      headers,
      rows: [
        ["TL-1001", "Irfan Haider", "Manzoor", "Class 7", "Govt High School Talis", "Talis", "100", "80", "Level 1"],
      ],
      availableWorksheets: ["Talis"],
    };
  }

  if (clean.includes("kanday")) {
    return {
      headers,
      rows: [
        ["KD-1101", "Rashid Minhas", "Shabbir", "Class 8", "Govt High School Kanday", "Kanday", "100", "84", "Level 1"],
      ],
      availableWorksheets: ["Kanday"],
    };
  }

  if (clean.includes("hushe")) {
    return {
      headers,
      rows: [
        ["HS-1201", "Jaffer Ali", "Haidar", "Class 9", "Govt High School Hushe", "Hushe", "100", "82", "Level 2"],
      ],
      availableWorksheets: ["Hushe"],
    };
  }

  if (clean.includes("thagus")) {
    return {
      headers,
      rows: [
        ["TG-1301", "Shakir Hussain", "Yousuf", "Class 8", "Govt High School Thagus", "Thagus", "100", "85", "Level 1"],
      ],
      availableWorksheets: ["Thagus"],
    };
  }

  if (clean.includes("special")) {
    return {
      headers,
      rows: [
        ["SS-1501", "Kamran Ali", "Ghulam Abbas", "Special Tier", "Special Education Complex Khaplu", "Khaplu", "100", "92", "Level 3"],
      ],
      availableWorksheets: ["SpecialSchool", "Summary"],
    };
  }

  if (clean.includes("dumsum") || clean.includes("domsum")) {
    return {
      headers,
      rows: [
        ["DM-1401", "Sairaa", "", "5th", "", "Domsum", "50", "25", "Level 1"],
        ["DM-1402", "Ebadd", "", "4th", "", "Domsum", "50", "22", "Level 1"],
        ["DM-1403", "Fatima", "", "4th", "", "Domsum", "50", "22", "Level 1"],
        ["DM-1404", "Sohial", "", "4th", "", "Domsum", "50", "21", "Level 1"],
        ["DM-1405", "Majid", "M.yousuf", "5th", "", "Domsum", "50", "19", "Level 1"],
        ["DM-1406", "Zahera", "", "5th", "", "Domsum", "50", "18", "Level 1"],
        ["DM-1407", "Saima", "", "5th", "", "Domsum", "50", "17", "Level 1"],
        ["DM-1408", "Yasira", "", "5th", "", "Domsum", "50", "17", "Level 1"],
        ["DM-1409", "Sosan", "", "5th", "", "Domsum", "50", "16", "Level 1"],
        ["DM-1410", "Sumiyaa", "", "5th", "", "Domsum", "50", "14", "Level 1"],
      ],
      availableWorksheets: ["Dumsum"],
    };
  }

  // Default: Khaplu (Comprehensive Testing Matrix)
  return {
    headers,
    rows: [
      ["TE-101", "Ali Raza", "Muhammad Hussain", "Class 8", "Govt High School Khaplu", "Khaplu", "100", "94", "Level 1"],
      ["TE-102", "Fatima Zahra", "Ghulam Mehdi", "Class 10", "Army Public School Khaplu", "Khaplu", "100", "91", "Level 2"],
      ["TE-103", "Kareem Ullah", "Sher Khan", "Class 12", "Public School & College Khaplu", "Khaplu", "100", "88", "Level 3"],
      // Identical student name with different father & different school:
      ["TE-104", "Muhammad Ali", "Hassan", "Class 7", "Govt High School Khaplu", "Khaplu", "100", "80", "Level 1"],
      ["TE-105", "Muhammad Ali", "Hussain", "Class 9", "Private Model School", "Khaplu", "100", "85", "Level 2"],
      // Identical student name & identical school, distinguished by Father Name:
      ["TE-106", "Zahid Hussain", "Ahmad", "Class 6", "Khaplu Public School", "Khaplu", "100", "75", "Level 1"],
      ["TE-107", "Zahid Hussain", "Ibrahim", "Class 6", "Khaplu Public School", "Khaplu", "100", "78", "Level 1"],
      // Identical student name & identical father, distinguished by School Name:
      ["TE-108", "Sajjad Ali", "Rehmat", "Class 8", "School A", "Khaplu", "100", "82", "Level 2"],
      ["TE-109", "Sajjad Ali", "Rehmat", "Class 8", "School B", "Khaplu", "100", "84", "Level 2"],
      // Unique student with missing Father Name in spreadsheet:
      ["TE-110", "Amina Bibi", "", "Class 5", "Girls High School Khaplu", "Khaplu", "100", "89", "Level 1"],
      // Unique student with missing School Name in spreadsheet:
      ["TE-111", "Tariq Aziz", "Aziz Ullah", "Class 11", "", "Khaplu", "100", "77", "Level 2"],
      // Unique student with missing optional columns (blank roll no, blank class, blank tehsil):
      ["", "Batool Fatima", "Ali Naqi", "", "Uswa School", "", "100", "90", "Level 1"],
      // Legacy Roll 222 Ali and 123 khan
      ["222", "Ali", "ab", "Class 7", "Triple E Model School", "Khaplu", "100", "59", "Level 1"],
      ["123", "khan", "bc", "Class 8", "Triple E Model School", "Khaplu", "100", "80", "Level 2"],
    ],
    availableWorksheets: ["Khaplu", "Summary"],
  };
}

/**
 * Searches and validates student result from the connected Google Sheet for an Examination Center.
 * Primary Search Key: Student Name (mandatory).
 * Secondary Verification: Father's Name (optional).
 * Additional Verification: School Name (optional).
 * Examination Center: Required selection determining which spreadsheet to query.
 */
export async function lookupStudentResultByCenter(
  centerQuery: string,
  studentNameInput: string,
  fatherNameInput?: string,
  schoolNameInput?: string,
  levelInput?: string
): Promise<{
  success: boolean;
  result?: StudentResult;
  message?: string;
  ambiguityDetected?: boolean;
  code?: 
    | "SUCCESS"
    | "NOT_FOUND"
    | "AMBIGUOUS_STUDENT"
    | "VERIFICATION_FAILED"
    | "CENTER_NOT_CONFIGURED"
    | "SHEET_ERROR"
    | "INVALID_INPUT";
}> {
  const cleanName = normalizeSearchString(studentNameInput);
  if (!cleanName) {
    return {
      success: false,
      code: "INVALID_INPUT",
      message: "Please enter the Student's Name to look up results.",
    };
  }

  const centerInfo = findCenterByIdOrName(centerQuery);
  if (!centerInfo) {
    return {
      success: false,
      code: "INVALID_INPUT",
      message: "Please select a valid Examination Center from the list of 15 centers.",
    };
  }

  // 1. Check center connection configuration
  const connection = getCenterConnection(centerInfo.id);
  if (
    !connection || 
    connection.status === "disconnected" || 
    (!connection.spreadsheetId && !connection.spreadsheetUrl)
  ) {
    return {
      success: false,
      code: "CENTER_NOT_CONFIGURED",
      message: `Results ledger for "${centerInfo.name}" examination center is currently not configured or connected. Please ask the administrator to configure its sheet.`,
    };
  }

  // 2. Cache key check
  const cacheKey = `center_${centerInfo.id}_${connection.spreadsheetId}_${connection.worksheetName}`;
  let sheetData = SHEET_CACHE.get(cacheKey);

  if (!sheetData || Date.now() - sheetData.timestamp > CACHE_TTL_MS) {
    try {
      const fetched = await fetchSheetValues(
        connection.spreadsheetId || centerInfo.id,
        connection.worksheetName || centerInfo.name,
        connection.headerRowIndex || 1
      );
      sheetData = {
        spreadsheetId: connection.spreadsheetId || centerInfo.id,
        worksheetName: connection.worksheetName || centerInfo.name,
        timestamp: Date.now(),
        headers: fetched.headers,
        rows: fetched.rows,
      };
      SHEET_CACHE.set(cacheKey, sheetData);
    } catch (err: any) {
      if (sheetData && sheetData.rows && sheetData.rows.length > 0) {
        console.warn(`[GoogleSheetsService] Temporary fetch issue for "${centerInfo.name}", continuing with cached ledger:`, err.message);
      } else {
        return {
          success: false,
          code: "SHEET_ERROR",
          message: err.message || `Unable to access examination records for "${centerInfo.name}".`,
        };
      }
    }
  }

  const { headers, rows } = sheetData;
  const mappings = connection.columnMappings || ({} as CenterColumnMappings);

  // 3. Resolve column indices
  const nameColIdx = findColumnIndex(headers, mappings.studentName, HEADER_ALIASES.studentName);
  const fatherColIdx = findColumnIndex(headers, mappings.fatherName, HEADER_ALIASES.fatherName);
  const classColIdx = findColumnIndex(headers, mappings.classOrSection, HEADER_ALIASES.classOrSection);
  const schoolColIdx = findColumnIndex(headers, mappings.schoolName, HEADER_ALIASES.schoolName);
  const tehsilColIdx = findColumnIndex(headers, mappings.tehsil, HEADER_ALIASES.tehsil);
  const obtColIdx = findColumnIndex(headers, mappings.obtainedMarks, HEADER_ALIASES.obtainedMarks);
  const totColIdx = findColumnIndex(headers, mappings.totalMarks, HEADER_ALIASES.totalMarks);
  const levelColIdx = findColumnIndex(headers, mappings.level, HEADER_ALIASES.level);
  const rollColIdx = findColumnIndex(headers, mappings.rollNumber, HEADER_ALIASES.rollNumber);

  if (nameColIdx === -1) {
    return {
      success: false,
      code: "SHEET_ERROR",
      message: `The Student Name column could not be detected in the examination ledger for "${centerInfo.name}". Please check the sheet column headers.`,
    };
  }

  // 4. Progressive filtering of candidate rows by student name
  // Tier 1: Exact normalized equality
  let nameMatches: string[][] = rows.filter((r) => {
    const val = r[nameColIdx];
    return matchesStudentName(val, studentNameInput, "exact");
  });

  // Tier 2: Punctuation-free equality (if no exact matches)
  if (nameMatches.length === 0) {
    nameMatches = rows.filter((r) => {
      const val = r[nameColIdx];
      return matchesStudentName(val, studentNameInput, "punct");
    });
  }

  // Tier 3: Canonical transliteration equality (Own <=> Awn <=> Oun <=> Aon)
  if (nameMatches.length === 0) {
    nameMatches = rows.filter((r) => {
      const val = r[nameColIdx];
      return matchesStudentName(val, studentNameInput, "canonical");
    });
  }

  // Tier 4: Word order permutation (Ali Own <=> Own Ali)
  if (nameMatches.length === 0) {
    nameMatches = rows.filter((r) => {
      const val = r[nameColIdx];
      return matchesStudentName(val, studentNameInput, "permutation");
    });
  }

  // Tier 5: Token subset / honorific prefix handling (Muhammad Arsalan <=> M. Arsalan, Syed Own Ali <=> Own Ali)
  if (nameMatches.length === 0) {
    nameMatches = rows.filter((r) => {
      const val = r[nameColIdx];
      return matchesStudentName(val, studentNameInput, "tokensubset");
    });
  }

  if (nameMatches.length === 0) {
    return {
      success: false,
      code: "NOT_FOUND",
      message: `No verified result record was found for student "${studentNameInput.trim()}" in ${centerInfo.name} examination center.`,
    };
  }

  // 4.1 Filter by Level (if levelInput is provided)
  const cleanTargetLevel = normalizeLevelString(levelInput);
  let candidateMatches = nameMatches;

  if (cleanTargetLevel) {
    const filteredByLevel = nameMatches.filter((r) => {
      const rowLevel = getRowLevel(r, levelColIdx, classColIdx);
      return rowLevel === cleanTargetLevel;
    });

    if (filteredByLevel.length > 0) {
      candidateMatches = filteredByLevel;
    } else {
      return {
        success: false,
        code: "NOT_FOUND",
        message: `No verified result record was found for student "${studentNameInput.trim()}" in ${cleanTargetLevel} at ${centerInfo.name} examination center. Please verify that your examination level is correct.`,
      };
    }
  }

  const cleanFather = fatherNameInput ? fatherNameInput.trim() : null;
  const cleanSchool = schoolNameInput ? schoolNameInput.trim() : null;

  let selectedCandidate: string[] | null = null;

  // Case A: Exactly 1 student found with this name (and level) in this center
  if (candidateMatches.length === 1) {
    const single = candidateMatches[0];
    const rowFather = fatherColIdx !== -1 ? single[fatherColIdx] : "";
    const rowSchool = schoolColIdx !== -1 ? single[schoolColIdx] : "";

    // If fatherName was provided by user
    if (cleanFather) {
      if (rowFather && rowFather.trim()) {
        if (!matchesFather(rowFather, cleanFather)) {
          // Father name does NOT match! Check if school name rescues it
          if (cleanSchool && rowSchool && matchesSchool(rowSchool, cleanSchool)) {
            selectedCandidate = single;
          } else {
            return {
              success: false,
              code: "VERIFICATION_FAILED",
              message: `The provided Father's Name does not match our records for "${studentNameInput.trim()}" in ${centerInfo.name}. Please verify your details.`,
            };
          }
        } else {
          // Father matches! If school is also provided, check school
          if (cleanSchool && rowSchool && !matchesSchool(rowSchool, cleanSchool)) {
            return {
              success: false,
              code: "VERIFICATION_FAILED",
              message: `The provided School Name does not match our records for "${studentNameInput.trim()}" in ${centerInfo.name}. Please verify your details.`,
            };
          }
          selectedCandidate = single;
        }
      } else {
        // Father name is missing from the spreadsheet row (e.g. student did not provide it during registration)
        if (cleanSchool && rowSchool && !matchesSchool(rowSchool, cleanSchool)) {
          return {
            success: false,
            code: "VERIFICATION_FAILED",
            message: `The provided School Name does not match our records for "${studentNameInput.trim()}" in ${centerInfo.name}. Please verify your details.`,
          };
        }
        // Single match with omitted father name in sheet -> Accept!
        selectedCandidate = single;
      }
    } else {
      // User did not provide father name
      if (cleanSchool && rowSchool && !matchesSchool(rowSchool, cleanSchool)) {
        return {
          success: false,
          code: "VERIFICATION_FAILED",
          message: `The provided School Name does not match our records for "${studentNameInput.trim()}" in ${centerInfo.name}. Please verify your details.`,
        };
      }
      // Unique match with omitted optional fields -> Accept!
      selectedCandidate = single;
    }
  } else {
    // Case B: Multiple students share the matching name in this center and level!
    // Disambiguation protocol:
    if (cleanFather) {
      const fatherMatches = candidateMatches.filter((r) => {
        const rf = fatherColIdx !== -1 ? r[fatherColIdx] : "";
        return matchesFather(rf, cleanFather);
      });

      if (fatherMatches.length === 1) {
        // Uniquely identified by father name
        const match = fatherMatches[0];
        const rowSchool = schoolColIdx !== -1 ? match[schoolColIdx] : "";
        if (cleanSchool && rowSchool && !matchesSchool(rowSchool, cleanSchool)) {
          return {
            success: false,
            code: "VERIFICATION_FAILED",
            message: `The provided School Name does not match the record for "${studentNameInput.trim()}" in ${centerInfo.name}.`,
          };
        }
        selectedCandidate = match;
      } else if (fatherMatches.length > 1) {
        // Multiple students have same name AND same father -> check school name
        if (cleanSchool) {
          const schoolMatches = fatherMatches.filter((r) => {
            const rs = schoolColIdx !== -1 ? r[schoolColIdx] : "";
            return matchesSchool(rs, cleanSchool);
          });
          if (schoolMatches.length === 1) {
            selectedCandidate = schoolMatches[0];
          } else {
            return {
              success: false,
              ambiguityDetected: true,
              code: "AMBIGUOUS_STUDENT",
              message: `Multiple records found with the name "${studentNameInput.trim()}", Father's Name "${fatherNameInput?.trim()}", and School "${schoolNameInput?.trim()}" in ${centerInfo.name}. Please contact the Examination Committee.`,
            };
          }
        } else {
          return {
            success: false,
            ambiguityDetected: true,
            code: "AMBIGUOUS_STUDENT",
            message: `Multiple students found with the name "${studentNameInput.trim()}" and Father's Name "${fatherNameInput?.trim()}" in ${centerInfo.name}. Please enter your School Name to verify your result.`,
          };
        }
      } else {
        // Father name did not match any candidate
        if (cleanSchool) {
          // Fallback: check if school name uniquely matches any of the candidates
          const schoolMatches = candidateMatches.filter((r) => {
            const rs = schoolColIdx !== -1 ? r[schoolColIdx] : "";
            return matchesSchool(rs, cleanSchool);
          });
          if (schoolMatches.length === 1) {
            selectedCandidate = schoolMatches[0];
          } else {
            return {
              success: false,
              code: "VERIFICATION_FAILED",
              message: `The provided verification details do not match any student record found for "${studentNameInput.trim()}" in ${centerInfo.name}.`,
            };
          }
        } else {
          return {
            success: false,
            code: "VERIFICATION_FAILED",
            message: `The provided Father's Name "${fatherNameInput?.trim()}" does not match any record found for "${studentNameInput.trim()}" in ${centerInfo.name}.`,
          };
        }
      }
    } else if (cleanSchool) {
      // User did not provide father name, but provided school name
      const schoolMatches = candidateMatches.filter((r) => {
        const rs = schoolColIdx !== -1 ? r[schoolColIdx] : "";
        return matchesSchool(rs, cleanSchool);
      });

      if (schoolMatches.length === 1) {
        selectedCandidate = schoolMatches[0];
      } else if (schoolMatches.length > 1) {
        return {
          success: false,
          ambiguityDetected: true,
          code: "AMBIGUOUS_STUDENT",
          message: `Multiple candidates were found with the name "${studentNameInput.trim()}" in the specified school. Please enter your Father's Name to identify your result.`,
        };
      } else {
        return {
          success: false,
          code: "VERIFICATION_FAILED",
          message: `The provided School Name "${schoolNameInput?.trim()}" does not match any record found for "${studentNameInput.trim()}" in ${centerInfo.name}.`,
        };
      }
    } else {
      // Both optional fields omitted with multiple candidates
      return {
        success: false,
        ambiguityDetected: true,
        code: "AMBIGUOUS_STUDENT",
        message: `Multiple candidates were found with the name "${studentNameInput.trim()}"${cleanTargetLevel ? ` in ${cleanTargetLevel}` : ""}. Please enter your Father's Name to identify your result.`,
      };
    }
  }

  if (!selectedCandidate) {
    return {
      success: false,
      code: "NOT_FOUND",
      message: `No verified result record was found for "${studentNameInput.trim()}" in ${centerInfo.name}.`,
    };
  }

  // 5. Construct Result Card Data
  const getCol = (idx: number): string => {
    if (idx === -1 || idx >= selectedCandidate!.length || selectedCandidate![idx] === undefined) {
      return "";
    }
    return String(selectedCandidate![idx]).trim();
  };

  const studentName = getCol(nameColIdx) || studentNameInput.trim();
  const fatherName = getCol(fatherColIdx) || undefined;
  const classOrSection = getCol(classColIdx) || undefined;
  const schoolName = getCol(schoolColIdx) || undefined;
  const tehsil = getCol(tehsilColIdx) || centerInfo.tehsil || undefined;
  const rawRowLevel = getCol(levelColIdx);
  const derivedRowLevel = getRowLevel(selectedCandidate, levelColIdx, classColIdx);
  const level = rawRowLevel || derivedRowLevel || cleanTargetLevel || undefined;
  const levelDescription = getLevelDescription(level) || undefined;
  const rollNumber = rollColIdx !== -1 && getCol(rollColIdx) ? getCol(rollColIdx) : undefined;

  // Marks Calculation
  const rawObt = getCol(obtColIdx);
  const rawTot = getCol(totColIdx);

  let obtainedMarks: number | undefined = undefined;
  let totalMarks: number | undefined = undefined;
  let percentage: number | undefined = undefined;
  let grade: string | undefined = undefined;
  let passFailStatus: StudentResult["passFailStatus"] = undefined;

  const marksEval = validateAndCalculateMarks(rawObt, rawTot);
  if (marksEval.valid) {
    obtainedMarks = marksEval.obtainedMarks;
    totalMarks = marksEval.totalMarks;
    percentage = marksEval.percentage;
    grade = marksEval.grade;
    passFailStatus = percentage >= 50 ? "Passed" : "Failed";
  } else {
    // If only obtained marks is present
    const cleanObt = String(rawObt).trim().replace(/[^0-9.]/g, "");
    if (cleanObt && !isNaN(Number(cleanObt))) {
      obtainedMarks = Number(cleanObt);
    }
    const cleanTot = String(rawTot).trim().replace(/[^0-9.]/g, "");
    if (cleanTot && !isNaN(Number(cleanTot)) && Number(cleanTot) > 0) {
      totalMarks = Number(cleanTot);
      if (obtainedMarks !== undefined) {
        percentage = Math.round(((obtainedMarks / totalMarks) * 100) * 10) / 10;
        grade = calculateGradeFromPercentage(percentage);
        passFailStatus = percentage >= 50 ? "Passed" : "Failed";
      }
    }
  }

  const result: StudentResult = {
    studentName,
    fatherName,
    schoolName,
    classOrSection,
    tehsil,
    examinationCenter: centerInfo.name,
    centerId: centerInfo.id,
    level,
    levelDescription,
    rollNumber,
    obtainedMarks,
    totalMarks,
    percentage,
    grade,
    passFailStatus,
    verifiedAt: new Date().toISOString(),
  };

  return {
    success: true,
    result,
    code: "SUCCESS",
  };
}
