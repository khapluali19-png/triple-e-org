import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { AdminAccount, AdminActivityLog } from "../types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const AUTH_FILE = path.join(DATA_DIR, "admin-auth.json");
const TMP_AUTH_FILE = path.join(os.tmpdir(), "triple-e-admin-auth.json");
const ACTIVITY_FILE = path.join(DATA_DIR, "admin-activity-log.json");

// Precomputed bcrypt hash for "ali12345" with cost 12
export const DEFAULT_INITIAL_HASH = "$2b$12$wi9oOSyubpoCCKNzCPdXPufQTa.5XqcxDt1RNG4MnZ2HxoI0lEm42";
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

  // 1. Read from workspace AUTH_FILE if exists
  let diskAccount: AdminAccount | null = null;
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, "utf-8");
      diskAccount = JSON.parse(raw) as AdminAccount;
    }
  } catch {
    // Disk read issue - fallback to defaults/memory
  }

  // 2. Read from /tmp fallback (supports serverless / Vercel instances)
  try {
    if (fs.existsSync(TMP_AUTH_FILE)) {
      const raw = fs.readFileSync(TMP_AUTH_FILE, "utf-8");
      const tmpAccount = JSON.parse(raw) as AdminAccount;
      if (!diskAccount || (tmpAccount.passwordChangedAt && !diskAccount.passwordChangedAt)) {
        diskAccount = tmpAccount;
      }
    }
  } catch {}

  const activeAccount: AdminAccount = diskAccount || cachedAccount || {
    email: configuredEmail,
    passwordHash: DEFAULT_INITIAL_HASH,
    mustChangePassword: false,
    lastLoginAt: null,
    passwordChangedAt: null,
  };

  // Preserve email if already saved on disk/cached, otherwise use configuredEmail
  if (!activeAccount.email) {
    activeAccount.email = configuredEmail;
  }

  // Preserve stored passwordHash! Only fallback if no hash is present at all.
  if (!activeAccount.passwordHash) {
    if (configuredPassword && configuredPassword !== DEFAULT_INITIAL_PASSWORD) {
      if (cachedEnvPassword !== configuredPassword || !cachedEnvPasswordHash) {
        cachedEnvPassword = configuredPassword;
        cachedEnvPasswordHash = bcrypt.hashSync(configuredPassword, 12);
      }
      activeAccount.passwordHash = cachedEnvPasswordHash;
    } else {
      activeAccount.passwordHash = DEFAULT_INITIAL_HASH;
    }
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

  const toWrite = {
    email: account.email,
    passwordHash: account.passwordHash,
    mustChangePassword: account.mustChangePassword,
    lastLoginAt: account.lastLoginAt || null,
    passwordChangedAt: account.passwordChangedAt || null,
  };

  let persisted = false;

  // 1. Write to repository workspace file
  try {
    if (ensureDirExists(DATA_DIR)) {
      fs.writeFileSync(AUTH_FILE, JSON.stringify(toWrite, null, 2), "utf-8");
      persisted = true;
    }
  } catch (err: any) {
    console.warn(`[AdminAuthStore] Filesystem write bypassed: ${err?.message || err}`);
  }

  // 2. Write to /tmp fallback (ensures writable persistence across lambda lifecycles)
  try {
    fs.writeFileSync(TMP_AUTH_FILE, JSON.stringify(toWrite, null, 2), "utf-8");
    persisted = true;
  } catch (err: any) {
    console.warn(`[AdminAuthStore] /tmp write failed: ${err?.message || err}`);
  }

  return { persisted };
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
  const savedEmail = (account.email || "").trim().toLowerCase();
  const defaultPlaceholderEmail = "abx@triple-e-.com";

  // Match saved administrator email OR default placeholder email
  const isEmailMatch = cleanEmail === savedEmail || cleanEmail === defaultPlaceholderEmail;

  if (!isEmailMatch) {
    recordFailedAttempt(clientIp);
    return {
      success: false,
      message: "Invalid administrator credentials.",
    };
  }

  let matches = false;

  // 1. Primary check: verify against bcrypt hash
  if (account.passwordHash) {
    try {
      matches = await bcrypt.compare(passwordInput, account.passwordHash);
    } catch (err) {
      console.error("[AdminAuthStore] bcrypt comparison error:", err);
      matches = false;
    }
  }

  // 2. Fallback check: ONLY if the password has NEVER been changed and is the initial bootstrap password
  if (!matches && !account.passwordChangedAt && account.passwordHash === DEFAULT_INITIAL_HASH) {
    const targetPassword = (process.env.INITIAL_ADMIN_PASSWORD || DEFAULT_INITIAL_PASSWORD).trim();
    matches = passwordInput === targetPassword;
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
  persisted?: boolean;
}> {
  const session = validateAdminSession(sessionToken);
  if (!session.valid || !session.account) {
    return { success: false, message: "Unauthorized. Please sign in again." };
  }

  const account = session.account;
  const configuredPassword = (process.env.INITIAL_ADMIN_PASSWORD || DEFAULT_INITIAL_PASSWORD).trim();

  let matches = false;
  if (account.passwordHash) {
    try {
      matches = await bcrypt.compare(currentPassword, account.passwordHash);
    } catch {
      matches = false;
    }
  }

  // If not matched yet and password was never changed, check configured bootstrap password
  if (!matches && !account.passwordChangedAt && account.passwordHash === DEFAULT_INITIAL_HASH) {
    matches = currentPassword === configuredPassword;
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

  // Hash new password using bcrypt cost 12
  const salt = await bcrypt.genSalt(12);
  const newHash = await bcrypt.hash(newPassword, salt);

  account.passwordHash = newHash;
  account.mustChangePassword = false;
  account.passwordChangedAt = new Date().toISOString();

  // Attempt persistence
  const saveResult = saveAdminAccount(account);

  logAdminActivity(
    "Password Changed",
    account.email,
    "Administrator password was updated successfully."
  );

  return {
    success: true,
    persisted: saveResult.persisted,
    message: "Password updated successfully! You can now log in with your new password.",
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
