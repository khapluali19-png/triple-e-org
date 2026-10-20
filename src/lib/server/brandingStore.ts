import fs from "fs";
import path from "path";
import { WebsiteBrandingConfig } from "../types";
import { DEFAULT_BRANDING } from "../constants";
import { logAdminActivity } from "./adminAuthStore";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const BRANDING_FILE = path.join(DATA_DIR, "branding-config.json");

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
 * Retrieves server-side website branding settings.
 */
let inMemoryBranding: WebsiteBrandingConfig | null = null;

export function getWebsiteBranding(): WebsiteBrandingConfig {
  if (inMemoryBranding) {
    return inMemoryBranding;
  }

  ensureDirExists(DATA_DIR);

  if (!fs.existsSync(BRANDING_FILE)) {
    try {
      fs.writeFileSync(BRANDING_FILE, JSON.stringify(DEFAULT_BRANDING, null, 2), "utf-8");
    } catch {
      // serverless read-only
    }
    inMemoryBranding = DEFAULT_BRANDING;
    return DEFAULT_BRANDING;
  }

  try {
    const raw = fs.readFileSync(BRANDING_FILE, "utf-8");
    const parsed = JSON.parse(raw);
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
    };
    inMemoryBranding = resolved;
    return resolved;
  } catch (err) {
    console.error("Failed to read branding config file, using defaults:", err);
    inMemoryBranding = DEFAULT_BRANDING;
    return DEFAULT_BRANDING;
  }
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
  };

  inMemoryBranding = merged;

  try {
    ensureDirExists(DATA_DIR);
    const tempFile = `${BRANDING_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(merged, null, 2), "utf-8");
    fs.renameSync(tempFile, BRANDING_FILE);
  } catch (err: any) {
    console.warn("[BrandingStore] Filesystem write bypassed in serverless environment:", err?.message || err);
  }

  logAdminActivity("Website Branding Updated", actor, "Updated competition identity, ribbons, or social links.");

  return merged;
}
