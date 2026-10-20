#!/usr/bin/env node
/**
 * Triple E Organization Result Portal
 * Operator Password Reset & Environment Generator CLI Tool
 *
 * Usage:
 *   node scripts/reset-admin-password.mjs [newPassword] [adminEmail]
 *   npm run reset-admin -- "MyNewPassword123"
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "src", "data");
const AUTH_FILE = path.join(DATA_DIR, "admin-auth.json");

const args = process.argv.slice(2);
const requestedPassword = args[0] || "ali12345";
const requestedEmail = (args[1] || "khapluali19@gmail.com").trim().toLowerCase();

if (requestedPassword.length < 8) {
  console.error("\n\x1b[31m[ERROR]\x1b[0m Password must be at least 8 characters long.");
  console.error(`Received: "${requestedPassword}" (${requestedPassword.length} characters)\n`);
  process.exit(1);
}

console.log("\n============================================================");
console.log("   TRIPLE E ORGANIZATION - ADMIN PASSWORD RESET TOOL        ");
console.log("============================================================\n");

console.log(`[1/3] Generating high-security bcrypt salt (cost 12)...`);
const salt = bcrypt.genSaltSync(12);
const passwordHash = bcrypt.hashSync(requestedPassword, salt);

// Verify hash immediately
const isValid = bcrypt.compareSync(requestedPassword, passwordHash);
if (!isValid) {
  console.error("\x1b[31m[FATAL]\x1b[0m Cryptographic verification of generated hash failed.");
  process.exit(1);
}
console.log(`\x1b[32m✔ [OK]\x1b[0m Bcrypt hash generated and self-verified.`);

console.log(`[2/3] Updating local authentication repository (${AUTH_FILE})...`);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const updatedAccount = {
  email: requestedEmail,
  passwordHash: passwordHash,
  mustChangePassword: requestedPassword === "ali12345", // If default, require change; if custom, ready
  lastLoginAt: null,
  passwordChangedAt: new Date().toISOString(),
};

fs.writeFileSync(AUTH_FILE, JSON.stringify(updatedAccount, null, 2), "utf-8");
console.log(`\x1b[32m✔ [OK]\x1b[0m Local admin-auth.json updated successfully.`);

console.log(`[3/3] Generating Vercel Production Environment Variables...`);
const generatedSecret = crypto.randomBytes(32).toString("hex");

console.log("\n------------------------------------------------------------");
console.log("  CREDENTIALS SUMMARY");
console.log("------------------------------------------------------------");
console.log(`  Admin Email:     \x1b[36m${requestedEmail}\x1b[0m`);
console.log(`  New Password:    \x1b[33m${requestedPassword}\x1b[0m`);
console.log(`  Bcrypt Hash:     \x1b[90m${passwordHash}\x1b[0m`);
console.log("------------------------------------------------------------\n");

console.log("============================================================");
console.log("  COPY-PASTE FOR VERCEL ENVIRONMENT VARIABLES");
console.log("============================================================");
console.log(`INITIAL_ADMIN_EMAIL=${requestedEmail}`);
console.log(`INITIAL_ADMIN_PASSWORD=${requestedPassword}`);
console.log(`ADMIN_ACCESS_SECRET=${generatedSecret}`);
console.log("============================================================\n");

console.log("NEXT STEPS FOR VERCEL DEPLOYMENT:");
console.log("------------------------------------------------------------");
console.log("Option A (Vercel Environment Variable):");
console.log("  1. Open Vercel Dashboard -> triple-e-org -> Settings -> Environment Variables.");
console.log("  2. Update INITIAL_ADMIN_PASSWORD with your desired password.");
console.log("  3. (If set) REMOVE any existing ADMIN_PASSWORD_HASH variable so it does not interfere.");
console.log("  4. Redeploy.");
console.log("");
console.log("Option B (Git Repository Update):");
console.log("  1. git add src/data/admin-auth.json");
console.log("  2. git commit -m \"chore: reset administrator credentials\"");
console.log("  3. git push origin main");
console.log("------------------------------------------------------------\n");
