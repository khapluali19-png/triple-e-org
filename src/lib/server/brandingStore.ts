import fs from "fs";
import path from "path";
import os from "os";
import { WebsiteBrandingConfig } from "../types";
import { DEFAULT_BRANDING, DEFAULT_COUNTDOWN } from "../constants";
import { logAdminActivity } from "./adminAuthStore";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const BRANDING_FILE = path.join(DATA_DIR, "branding-config.json");
const TMP_BRANDING_FILE = path.join(os.tmpdir(), "triple-e-branding-config.json");

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Validates a social URL to ensure it has a valid web scheme if supplied.
 */
export function isValidWebUrl(url?: string): boolean {
  if (!url || !url.trim()) return true;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * In-memory branding runtime cache and last write timestamp
 */
let inMemoryBranding: WebsiteBrandingConfig | null = null;
let lastPersistedTimestamp = 0;

/**
 * Retrieves server-side website branding settings.
 * Supports /tmp fallback for serverless environments (e.g. Vercel).
 */
export function getWebsiteBranding(): WebsiteBrandingConfig {
  let fileContent: string | null = null;
  let fileMtime = 0;

  // 1. Check workspace BRANDING_FILE first (primary repository configuration)
  try {
    ensureDirExists(DATA_DIR);
    if (fs.existsSync(BRANDING_FILE)) {
      const stats = fs.statSync(BRANDING_FILE);
      fileContent = fs.readFileSync(BRANDING_FILE, "utf-8");
      fileMtime = stats.mtimeMs;
    }
  } catch {
    // file read error ignored
  }

  // 2. Check /tmp file (prefer if newer, supporting serverless runtimes)
  try {
    if (fs.existsSync(TMP_BRANDING_FILE)) {
      const stats = fs.statSync(TMP_BRANDING_FILE);
      if (!fileContent || stats.mtimeMs > fileMtime) {
        fileContent = fs.readFileSync(TMP_BRANDING_FILE, "utf-8");
        fileMtime = stats.mtimeMs;
      }
    }
  } catch {
    // /tmp read error ignored
  }

  // 3. Parse file content if available from disk
  if (fileContent) {
    try {
      const parsed = JSON.parse(fileContent);
      const parsedCountdownEnabled = parsed.countdown?.enabled;
      const isCountdownOn = typeof parsedCountdownEnabled === "boolean"
        ? parsedCountdownEnabled
        : typeof parsed.resultsPublished === "boolean"
          ? !parsed.resultsPublished
          : DEFAULT_COUNTDOWN.enabled;

      const resolved: WebsiteBrandingConfig = {
        ...DEFAULT_BRANDING,
        ...parsed,
        socialLinks: {
          ...DEFAULT_BRANDING.socialLinks,
          ...(parsed.socialLinks || {}),
        },
        lookupLabels: {
          ...DEFAULT_BRANDING.lookupLabels,
          ...(parsed.lookupLabels || {}),
        },
        resultCardLabels: {
          ...DEFAULT_BRANDING.resultCardLabels,
          ...(parsed.resultCardLabels || {}),
        },
        fieldVisibility: {
          ...DEFAULT_BRANDING.fieldVisibility,
          ...(parsed.fieldVisibility || {}),
        },
        partnerAttribution: {
          ...DEFAULT_BRANDING.partnerAttribution,
          ...(parsed.partnerAttribution || {}),
        },
        countdown: {
          ...(DEFAULT_BRANDING.countdown || {}),
          ...(parsed.countdown || {}),
          enabled: isCountdownOn,
        },
        resultsPublished: !isCountdownOn,
      };

      inMemoryBranding = resolved;
      lastPersistedTimestamp = fileMtime;
      return resolved;
    } catch (err) {
      console.error("Failed to parse branding config file, using fallback:", err);
    }
  }

  // 5. Fallback to inMemoryBranding or DEFAULT_BRANDING
  return inMemoryBranding || DEFAULT_BRANDING;
}

/**
 * Persists updated branding settings with validation and logs administrative activity.
 */
export function saveWebsiteBranding(
  updates: Partial<WebsiteBrandingConfig>,
  actor: string
): WebsiteBrandingConfig {
  ensureDirExists(DATA_DIR);
  const current = getWebsiteBranding();

  // Validate social URLs if provided
  if (updates.socialLinks) {
    const { facebook, instagram, youtube, linkedin } = updates.socialLinks;
    if (facebook && !isValidWebUrl(facebook)) {
      throw new Error("Invalid Facebook URL format. Must start with http:// or https://");
    }
    if (instagram && !isValidWebUrl(instagram)) {
      throw new Error("Invalid Instagram URL format. Must start with http:// or https://");
    }
    if (youtube && !isValidWebUrl(youtube)) {
      throw new Error("Invalid YouTube URL format. Must start with http:// or https://");
    }
    if (linkedin && !isValidWebUrl(linkedin)) {
      throw new Error("Invalid LinkedIn URL format. Must start with http:// or https://");
    }
  }

  // Validate partner website URL if provided
  if (updates.partnerAttribution?.partnerWebsiteUrl && !isValidWebUrl(updates.partnerAttribution.partnerWebsiteUrl)) {
    throw new Error("Invalid Partner Website URL format. Must start with http:// or https://");
  }

  let isCountdownOn = current.countdown?.enabled ?? DEFAULT_BRANDING.countdown?.enabled ?? true;
  if (updates.countdown && typeof updates.countdown.enabled === "boolean") {
    isCountdownOn = updates.countdown.enabled;
  } else if (typeof updates.resultsPublished === "boolean") {
    isCountdownOn = !updates.resultsPublished;
  }

  const merged: WebsiteBrandingConfig = {
    ...current,
    ...updates,
    socialLinks: {
      ...current.socialLinks,
      ...(updates.socialLinks || {}),
    },
    lookupLabels: {
      ...current.lookupLabels,
      ...(updates.lookupLabels || {}),
    },
    resultCardLabels: {
      ...current.resultCardLabels,
      ...(updates.resultCardLabels || {}),
    },
    fieldVisibility: {
      ...current.fieldVisibility,
      ...(updates.fieldVisibility || {}),
    },
    partnerAttribution: {
      ...current.partnerAttribution,
      ...(updates.partnerAttribution || {}),
    },
    countdown: {
      ...(current.countdown || DEFAULT_BRANDING.countdown || {}),
      ...(updates.countdown || {}),
      enabled: isCountdownOn,
    },
    resultsPublished: !isCountdownOn,
  };

  inMemoryBranding = merged;
  lastPersistedTimestamp = Date.now();

  // 1. Write to repository workspace file (works in local dev and dedicated persistent servers)
  try {
    ensureDirExists(DATA_DIR);
    fs.writeFileSync(BRANDING_FILE, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[BrandingStore] Filesystem write bypassed in serverless environment:", err?.message || err);
  }

  // 2. Write to /tmp (guaranteed writable across AWS Lambda, Vercel Serverless, Linux, Mac, Windows)
  try {
    fs.writeFileSync(TMP_BRANDING_FILE, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[BrandingStore] /tmp write failed:", err?.message || err);
  }

  logAdminActivity("Website Branding Updated", actor, "Updated competition identity, ribbons, or social links.");

  return merged;
}
