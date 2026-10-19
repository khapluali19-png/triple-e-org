import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { AdminAccount, AdminActivityLog } from "../types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const AUTH_FILE = path.join(DATA_DIR, "admin-auth.json");
const ACTIVITY_FILE = path.join(DATA_DIR, "admin-activity-log.json");

// Rate limiting for admin login (IP -> failed attempt timestamps)
const LOGIN_RATE_LIMIT = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILED_ATTEMPTS = 5;

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Controlled bootstrap process: Reads initial admin credentials from server-side environment
 * variables and generates a secure bcrypt hash. Plaintext password is NEVER stored.
 */
export function getAdminAccount(): AdminAccount {
  ensureDirExists(DATA_DIR);

  if (!fs.existsSync(AUTH_FILE)) {
    // Read from environment during controlled bootstrap
    const initialEmail = process.env.INITIAL_ADMIN_EMAIL || "khapluali19@gmail.com";
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "ali12345";

    // Hash initial password securely with bcrypt
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(initialPassword, salt);

    const initialAccount: AdminAccount = {
      email: initialEmail.trim().toLowerCase(),
      passwordHash,
      mustChangePassword: true, // Forces password change on initial login
      lastLoginAt: null,
      passwordChangedAt: null,
    };

    fs.writeFileSync(AUTH_FILE, JSON.stringify(initialAccount, null, 2), "utf-8");
    logAdminActivity(
      "System Bootstrap",
      initialEmail,
      "Initial administrator account initialized with encrypted credentials."
    );
    return initialAccount;
  }

  try {
    const raw = fs.readFileSync(AUTH_FILE, "utf-8");
    return JSON.parse(raw) as AdminAccount;
  } catch (error) {
    console.error("Failed to read admin auth file:", error);
    throw new Error("Unable to read administrator authentication repository.");
  }
}

function saveAdminAccount(account: AdminAccount): void {
  ensureDirExists(DATA_DIR);
  const tempFile = `${AUTH_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(account, null, 2), "utf-8");
  fs.renameSync(tempFile, AUTH_FILE);
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
 * Verifies admin login credentials against bcrypt hash and generates an authenticated session token.
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
  const cleanEmail = emailInput.trim().toLowerCase();

  if (cleanEmail !== account.email) {
    recordFailedAttempt(clientIp);
    return {
      success: false,
      message: "Invalid administrator credentials.",
    };
  }

  // Compare password with bcrypt hash
  const matches = await bcrypt.compare(passwordInput, account.passwordHash);
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

  // Generate secure 256-bit random session token
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  account.sessionToken = sessionToken;
  account.sessionExpiresAt = expiresAt;
  account.lastLoginAt = new Date().toISOString();
  saveAdminAccount(account);

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
 */
export function validateAdminSession(sessionToken?: string | null): {
  valid: boolean;
  account?: AdminAccount;
} {
  if (!sessionToken || typeof sessionToken !== "string") {
    return { valid: false };
  }

  try {
    const account = getAdminAccount();
    if (!account.sessionToken || account.sessionToken !== sessionToken.trim()) {
      return { valid: false };
    }

    if (account.sessionExpiresAt && new Date(account.sessionExpiresAt).getTime() < Date.now()) {
      return { valid: false };
    }

    return { valid: true, account };
  } catch {
    return { valid: false };
  }
}

/**
 * Changes administrator password with validation, re-hashes with bcrypt, and clears mustChangePassword flag.
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
  sessionToken: string
): Promise<{ success: boolean; message: string }> {
  const session = validateAdminSession(sessionToken);
  if (!session.valid || !session.account) {
    return { success: false, message: "Unauthorized. Please sign in again." };
  }

  const account = session.account;
  const matches = await bcrypt.compare(currentPassword, account.passwordHash);
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
  saveAdminAccount(account);

  logAdminActivity(
    "Password Changed",
    account.email,
    "Administrator password was successfully updated and verified."
  );

  return { success: true, message: "Password updated successfully." };
}

/**
 * Terminates administrator session.
 */
export function invalidateAdminSession(sessionToken?: string | null): void {
  if (!sessionToken) return;
  try {
    const account = getAdminAccount();
    if (account.sessionToken === sessionToken) {
      account.sessionToken = undefined;
      account.sessionExpiresAt = undefined;
      saveAdminAccount(account);
      logAdminActivity("Admin Sign Out", account.email, "Administrator session ended.");
    }
  } catch (err) {
    console.error("Failed to invalidate session:", err);
  }
}

/**
 * Logs administrative events to disk without storing student personal information.
 */
export function logAdminActivity(
  action: string,
  actor: string,
  details: string,
  category?: string
): void {
  try {
    ensureDirExists(DATA_DIR);
    let logs: AdminActivityLog[] = [];
    if (fs.existsSync(ACTIVITY_FILE)) {
      const raw = fs.readFileSync(ACTIVITY_FILE, "utf-8");
      logs = JSON.parse(raw);
    }

    const newLog: AdminActivityLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      actor,
      category,
      details,
    };

    logs.unshift(newLog);
    // Keep last 50 activities
    if (logs.length > 50) {
      logs = logs.slice(0, 50);
    }

    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write admin activity log:", err);
  }
}

export function getAdminActivities(): AdminActivityLog[] {
  try {
    ensureDirExists(DATA_DIR);
    if (!fs.existsSync(ACTIVITY_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(ACTIVITY_FILE, "utf-8");
    return JSON.parse(raw) as AdminActivityLog[];
  } catch {
    return [];
  }
}
