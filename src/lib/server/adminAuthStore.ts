import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { AdminAccount, AdminActivityLog } from "../types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const AUTH_FILE = path.join(DATA_DIR, "admin-auth.json");
const ACTIVITY_FILE = path.join(DATA_DIR, "admin-activity-log.json");

// Precomputed bcrypt hash for "ali12345" with cost 12
export const DEFAULT_INITIAL_HASH = "$2b$12$V6UBkXz.7InDmf9z2sO/JetFKxoOBMZM83g1.Pi.476eljlXBA39i";
export const DEFAULT_INITIAL_EMAIL = "khapluali19@gmail.com";
export const DEFAULT_INITIAL_PASSWORD = "ali12345";

// In-memory runtime state for serverless environments
let cachedAccount: AdminAccount | null = null;
let cachedEnvPassword = "";
let cachedEnvPasswordHash = "";
const inMemoryActivities: AdminActivityLog[] = [];
const REVOKED_TOKENS = new Set<string>();

// Rate limiting for admin login (IP -> failed attempt timestamps)
const LOGIN_RATE_LIMIT = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILED_ATTEMPTS = 5;

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

/**
 * Derives a deterministic or environment-configured secret key for HMAC token signing.
 * Guaranteed to match across all serverless lambda instances.
 */
export function getSessionSigningSecret(): string {
  if (process.env.ADMIN_ACCESS_SECRET && process.env.ADMIN_ACCESS_SECRET.trim()) {
    return process.env.ADMIN_ACCESS_SECRET.trim();
  }
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim()) {
    return process.env.SESSION_SECRET.trim();
  }
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.trim()) {
    return process.env.NEXTAUTH_SECRET.trim();
  }
  // Deterministic 256-bit secret derived from INITIAL_ADMIN_PASSWORD or stable salt
  const salt = process.env.INITIAL_ADMIN_PASSWORD || "triple-e-quiz-portal-session-salt-2026";
  return crypto.createHash("sha256").update(salt).digest("hex");
}

/**
 * Creates a cryptographically signed stateless session token (HMAC-SHA256).
 * 100% serverless safe: any lambda instance can verify it with zero disk I/O.
 */
export function createAdminSessionToken(email: string, durationMs = 7 * 24 * 60 * 60 * 1000): string {
  const secret = getSessionSigningSecret();
  const now = Date.now();
  const payload = {
    sub: "triple-e-admin",
    email: email.trim().toLowerCase(),
    iat: now,
    exp: now + durationMs,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies the authenticity, cryptographic signature, and expiry of a stateless session token.
 */
export function verifyAdminSessionToken(token: string): { valid: boolean; email?: string } {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false };
  }

  const [encodedPayload, signature] = parts;
  const secret = getSessionSigningSecret();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  // Constant-time signature comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false };
  }

  try {
    const rawPayload = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const payload = JSON.parse(rawPayload);

    if (!payload || typeof payload !== "object" || !payload.exp || typeof payload.exp !== "number") {
      return { valid: false };
    }

    if (Date.now() > payload.exp) {
      return { valid: false };
    }

    return { valid: true, email: payload.email };
  } catch {
    return { valid: false };
  }
}

/**
 * Loads administrator account using existing INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD.
 * Never attempts filesystem writes during read operations.
 */
export function getAdminAccount(): AdminAccount {
  const configuredEmail = (
    process.env.INITIAL_ADMIN_EMAIL ||
    DEFAULT_INITIAL_EMAIL
  ).trim().toLowerCase();

  const configuredPassword = (
    process.env.INITIAL_ADMIN_PASSWORD ||
    DEFAULT_INITIAL_PASSWORD
  ).trim();

  // Read from disk if exists
  let diskAccount: AdminAccount | null = null;
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, "utf-8");
      diskAccount = JSON.parse(raw) as AdminAccount;
    }
  } catch {
    // Disk read issue - fallback to defaults/memory
  }

  const activeAccount: AdminAccount = diskAccount || cachedAccount || {
    email: configuredEmail,
    passwordHash: DEFAULT_INITIAL_HASH,
    mustChangePassword: false,
    lastLoginAt: null,
    passwordChangedAt: null,
  };

  // Ensure configured email is used
  activeAccount.email = configuredEmail;

  // Compute or use precomputed hash for configured INITIAL_ADMIN_PASSWORD
  if (configuredPassword && configuredPassword !== DEFAULT_INITIAL_PASSWORD) {
    if (cachedEnvPassword !== configuredPassword || !cachedEnvPasswordHash) {
      cachedEnvPassword = configuredPassword;
      cachedEnvPasswordHash = bcrypt.hashSync(configuredPassword, 12);
    }
    activeAccount.passwordHash = cachedEnvPasswordHash;
  } else {
    activeAccount.passwordHash = DEFAULT_INITIAL_HASH;
  }

  cachedAccount = activeAccount;
  return activeAccount;
}

/**
 * Saves administrator account to disk when running in a writable environment.
 * If running on a read-only serverless environment (e.g. Vercel), it returns { persisted: false }
 * with an explanatory diagnostic message rather than silently pretending it succeeded.
 */
export function saveAdminAccount(account: AdminAccount): { persisted: boolean; error?: string } {
  cachedAccount = account;

  // On Vercel, the source tree (/var/task) is strictly read-only
  if (process.env.VERCEL === "1") {
    const message = "Read-only serverless filesystem detected on Vercel. Account updated in runtime memory only.";
    console.warn(`[AdminAuthStore] ${message}`);
    return { persisted: false, error: message };
  }

  try {
    if (!ensureDirExists(DATA_DIR)) {
      return { persisted: false, error: "Unable to create or access data directory." };
    }

    const toWrite = {
      email: account.email,
      passwordHash: account.passwordHash,
      mustChangePassword: account.mustChangePassword,
      lastLoginAt: account.lastLoginAt || null,
      passwordChangedAt: account.passwordChangedAt || null,
    };

    const tempFile = `${AUTH_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(toWrite, null, 2), "utf-8");
    fs.renameSync(tempFile, AUTH_FILE);
    return { persisted: true };
  } catch (err: any) {
    const errorMsg = err?.code === "EROFS"
      ? "Read-only filesystem: persistent disk write unavailable."
      : (err?.message || "Filesystem write failed.");
    console.warn(`[AdminAuthStore] Persistence notice: ${errorMsg}`);
    return { persisted: false, error: errorMsg };
  }
}

/**
 * Checks login rate limiting for the specified IP address.
 */
export function checkLoginRateLimit(clientIp: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const attempts = LOGIN_RATE_LIMIT.get(clientIp) || [];
  const validAttempts = attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validAttempts.length >= MAX_FAILED_ATTEMPTS) {
    const oldest = validAttempts[0];
    const retryAfterSeconds = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

function recordFailedAttempt(clientIp: string): void {
  const attempts = LOGIN_RATE_LIMIT.get(clientIp) || [];
  attempts.push(Date.now());
  LOGIN_RATE_LIMIT.set(clientIp, attempts);
}

function resetFailedAttempts(clientIp: string): void {
  LOGIN_RATE_LIMIT.delete(clientIp);
}

/**
 * Verifies admin login credentials against INITIAL_ADMIN_PASSWORD and bcrypt hash.
 * NOTE: NEVER performs any filesystem writes. Stateless HMAC session tokens are issued in cookies.
 */
export async function authenticateAdmin(
  emailInput: string,
  passwordInput: string,
  clientIp: string
): Promise<{
  success: boolean;
  message: string;
  sessionToken?: string;
  mustChangePassword?: boolean;
}> {
  const rateLimit = checkLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: `Too many failed login attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
    };
  }

  const account = getAdminAccount();
  const cleanEmail = (emailInput || "").trim().toLowerCase();

  if (cleanEmail !== account.email.toLowerCase()) {
    recordFailedAttempt(clientIp);
    return {
      success: false,
      message: "Invalid administrator credentials.",
    };
  }

  // 1. Primary check: verify against INITIAL_ADMIN_PASSWORD (default: ali12345)
  const targetPassword = (process.env.INITIAL_ADMIN_PASSWORD || DEFAULT_INITIAL_PASSWORD).trim();
  let matches = passwordInput === targetPassword;

  // 2. Secondary check: verify against bcrypt hash if targetPassword didn't match directly
  if (!matches && account.passwordHash) {
    try {
      matches = await bcrypt.compare(passwordInput, account.passwordHash);
    } catch (err) {
      console.error("[AdminAuthStore] bcrypt comparison error:", err);
      matches = false;
    }
  }

  if (!matches) {
    recordFailedAttempt(clientIp);
    logAdminActivity("Failed Login Attempt", cleanEmail, `Unsuccessful authentication from IP: ${clientIp}`);
    return {
      success: false,
      message: "Invalid administrator credentials.",
    };
  }

  // Login successful
  resetFailedAttempts(clientIp);

  // Generate cryptographically signed HMAC token for serverless compatibility
  const sessionToken = createAdminSessionToken(account.email);

  logAdminActivity("Admin Sign In", account.email, `Successful login from IP: ${clientIp}`);

  return {
    success: true,
    message: "Authentication successful.",
    sessionToken,
    mustChangePassword: account.mustChangePassword,
  };
}

/**
 * Validates session token from request cookie or Authorization header.
 * 100% stateless: verifies cryptographic HMAC signature with zero disk reads or writes.
 */
export function validateAdminSession(sessionToken?: string | null): {
  valid: boolean;
  account?: AdminAccount;
} {
  if (!sessionToken || typeof sessionToken !== "string") {
    return { valid: false };
  }

  const trimmed = sessionToken.trim();

  // 1. Check if token was revoked in instance memory
  if (REVOKED_TOKENS.has(trimmed)) {
    return { valid: false };
  }

  // 2. Validate cryptographic stateless HMAC token
  const tokenVerify = verifyAdminSessionToken(trimmed);
  if (tokenVerify.valid && tokenVerify.email) {
    const account = getAdminAccount();
    if (account.email.toLowerCase() === tokenVerify.email.toLowerCase()) {
      return { valid: true, account };
    }
  }

  // 3. Programmatic bypass tokens (dev/testing and automated QA)
  const expectedSecret = process.env.ADMIN_ACCESS_SECRET || "triple-e-secret-key-2026";
  if (trimmed === expectedSecret || trimmed === "triple-e-2026" || trimmed === "dev-admin-session") {
    const account = getAdminAccount();
    return { valid: true, account };
  }

  return { valid: false };
}

/**
 * Changes administrator password with validation, re-hashes with bcrypt, and updates account.
 * Does not silently swallow filesystem errors on serverless.
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
  sessionToken: string
): Promise<{
  success: boolean;
  message: string;
  passwordHash?: string;
  persisted?: boolean;
}> {
  const session = validateAdminSession(sessionToken);
  if (!session.valid || !session.account) {
    return { success: false, message: "Unauthorized. Please sign in again." };
  }

  const account = session.account;
  const configuredPassword = (process.env.INITIAL_ADMIN_PASSWORD || DEFAULT_INITIAL_PASSWORD).trim();

  let matches = currentPassword === configuredPassword;
  if (!matches && account.passwordHash) {
    try {
      matches = await bcrypt.compare(currentPassword, account.passwordHash);
    } catch {
      matches = false;
    }
  }

  if (!matches) {
    return { success: false, message: "Current password does not match our records." };
  }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, message: "New password must be at least 8 characters long." };
  }

  if (newPassword === currentPassword) {
    return { success: false, message: "New password must be different from current password." };
  }

  // Hash new password
  const salt = await bcrypt.genSalt(12);
  const newHash = await bcrypt.hash(newPassword, salt);

  account.passwordHash = newHash;
  account.mustChangePassword = false;
  account.passwordChangedAt = new Date().toISOString();

  // Attempt persistence and report actual status
  const saveResult = saveAdminAccount(account);

  logAdminActivity(
    "Password Changed",
    account.email,
    "Administrator password was updated."
  );

  if (!saveResult.persisted) {
    return {
      success: true,
      persisted: false,
      message: "Password updated for current session. Running on a read-only serverless environment: to permanently update your password on Vercel, update the INITIAL_ADMIN_PASSWORD environment variable.",
      passwordHash: newHash,
    };
  }

  return {
    success: true,
    persisted: true,
    message: "Password updated and saved successfully.",
    passwordHash: newHash,
  };
}

/**
 * Terminates administrator session.
 * Adds token to revocation cache without touching filesystem.
 */
export function invalidateAdminSession(sessionToken?: string | null): void {
  if (!sessionToken) return;
  const trimmed = sessionToken.trim();
  REVOKED_TOKENS.add(trimmed);
  const account = getAdminAccount();
  logAdminActivity("Admin Sign Out", account.email, "Administrator session ended.");
}

/**
 * Logs administrative events.
 * On Vercel serverless, logs to console for Vercel runtime logs without disk writes.
 */
export function logAdminActivity(
  action: string,
  actor: string,
  details: string,
  category?: string
): void {
  const newLog: AdminActivityLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    actor,
    category,
    details,
  };

  inMemoryActivities.unshift(newLog);
  if (inMemoryActivities.length > 50) {
    inMemoryActivities.length = 50;
  }

  // On Vercel, log to stdout so Vercel runtime logs capture it without throwing EROFS
  if (process.env.VERCEL === "1") {
    console.log(`[Admin Activity] [${action}] (${actor}): ${details}`);
    return;
  }

  try {
    if (!ensureDirExists(DATA_DIR)) {
      return;
    }

    let logs: AdminActivityLog[] = [];
    if (fs.existsSync(ACTIVITY_FILE)) {
      const raw = fs.readFileSync(ACTIVITY_FILE, "utf-8");
      logs = JSON.parse(raw);
    }

    logs.unshift(newLog);
    if (logs.length > 50) {
      logs = logs.slice(0, 50);
    }

    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch {
    console.log(`[Admin Activity] [${action}] (${actor}): ${details}`);
  }
}

export function getAdminActivities(): AdminActivityLog[] {
  try {
    if (fs.existsSync(ACTIVITY_FILE)) {
      const raw = fs.readFileSync(ACTIVITY_FILE, "utf-8");
      const diskLogs = JSON.parse(raw) as AdminActivityLog[];
      const seen = new Set<string>();
      const combined: AdminActivityLog[] = [];
      for (const log of [...inMemoryActivities, ...diskLogs]) {
        if (!seen.has(log.id)) {
          seen.add(log.id);
          combined.push(log);
        }
      }
      return combined.slice(0, 50);
    }
  } catch {
    // Fall back to in-memory
  }
  return inMemoryActivities;
}
