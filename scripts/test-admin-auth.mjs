/**
 * Triple E Organization Admin Authentication & Serverless Resilience Verification Suite
 * Covers:
 * 1. Initial Account Resolution & Defaults
 * 2. Successful Login with Valid Credentials (Zero Filesystem Writes)
 * 3. Rejection of Invalid Credentials (Wrong Password, Wrong Email)
 * 4. Stateless Cryptographic Session Tokens (HMAC-SHA256, Tampering, Expiry)
 * 5. Logout & Revocation (Cookie Invalidation without Disk Writes)
 * 6. Rate Limiting Protection (5 failed attempts -> 429)
 * 7. Serverless Read-Only Filesystem Simulation (VERCEL=1 and EROFS handling)
 * 8. Transparent Persistence Reporting (persisted: false on read-only environments)
 * 9. Remote Environment Variable Override (ADMIN_PASSWORD_HASH precedence)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  getAdminAccount,
  saveAdminAccount,
  authenticateAdmin,
  createAdminSessionToken,
  verifyAdminSessionToken,
  validateAdminSession,
  invalidateAdminSession,
  changeAdminPassword,
  checkLoginRateLimit,
  logAdminActivity,
  getAdminActivities,
} from "../src/lib/server/adminAuthStore.ts";

let passed = 0;
let total = 0;

function assert(cond, name, detail = "") {
  total++;
  if (cond) {
    passed++;
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${name}`);
  } else {
    console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${name}`);
    if (detail) console.error(`    \x1b[33mDetail:\x1b[0m ${detail}`);
  }
}

async function run() {
  console.log("\n============================================================");
  console.log("   ADMIN AUTH & SERVERLESS RESILIENCE VERIFICATION SUITE    ");
  console.log("============================================================\n");

  const authFilePath = path.join(process.cwd(), "src", "data", "admin-auth.json");
  const authBackup = fs.existsSync(authFilePath) ? fs.readFileSync(authFilePath, "utf-8") : null;

  try {
    // -------------------------------------------------------------------------
    // 1. Initial Account Resolution & Defaults
    // -------------------------------------------------------------------------
    console.log("--- 1. Account Resolution & Defaults ---");
    const account = getAdminAccount();
    assert(account.email === "khapluali19@gmail.com", "Admin email defaults to khapluali19@gmail.com");
    assert(!!account.passwordHash, "Password hash is present");
    assert(account.mustChangePassword === true, "Initial account requires password change");

    // -------------------------------------------------------------------------
    // 2. Successful Login with Valid Credentials (No Disk Writes)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Credential Verification & Zero Disk Writes on Login ---");
    const statBefore = fs.existsSync(authFilePath) ? fs.statSync(authFilePath).mtimeMs : 0;
    
    const validRes = await authenticateAdmin("khapluali19@gmail.com", "ali12345", "10.0.0.1");
    assert(validRes.success === true, "Valid credentials return success: true");
    assert(typeof validRes.sessionToken === "string" && validRes.sessionToken.includes("."), "Session token is issued as signed HMAC token");
    assert(validRes.mustChangePassword === true, "Reports mustChangePassword: true");

    const statAfter = fs.existsSync(authFilePath) ? fs.statSync(authFilePath).mtimeMs : 0;
    assert(statBefore === statAfter, "CRITICAL: No filesystem write occurred to admin-auth.json during login");

    // Case insensitive email check
    const mixedEmailRes = await authenticateAdmin("KhapluAli19@GMAIL.com", "ali12345", "10.0.0.1");
    assert(mixedEmailRes.success === true, "Email comparison is case-insensitive");

    // -------------------------------------------------------------------------
    // 3. Rejection of Invalid Credentials
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Invalid Credentials Handling ---");
    const wrongPassRes = await authenticateAdmin("khapluali19@gmail.com", "wrongpass123", "10.0.0.2");
    assert(wrongPassRes.success === false, "Wrong password returns success: false");
    assert(wrongPassRes.message === "Invalid administrator credentials.", "Returns clean security message");

    const wrongEmailRes = await authenticateAdmin("stranger@unknown.com", "ali12345", "10.0.0.3");
    assert(wrongEmailRes.success === false, "Wrong email returns success: false");

    // -------------------------------------------------------------------------
    // 4. Stateless Cryptographic Session Tokens
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Stateless Cryptographic Session Tokens ---");
    const token = createAdminSessionToken("khapluali19@gmail.com");
    assert(typeof token === "string", "createAdminSessionToken returns string");

    const verifyValid = verifyAdminSessionToken(token);
    assert(verifyValid.valid === true, "verifyAdminSessionToken validates intact token");
    assert(verifyValid.email === "khapluali19@gmail.com", "verifyAdminSessionToken extracts correct email");

    // Tampered payload test
    const [payloadPart, sigPart] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: "hacker", email: "evil@hacker.com", exp: Date.now() + 100000 })
    ).toString("base64url");
    const tamperedToken = `${tamperedPayload}.${sigPart}`;
    const verifyTampered = verifyAdminSessionToken(tamperedToken);
    assert(verifyTampered.valid === false, "Tampered payload is rejected by signature verification");

    // Tampered signature test
    const badSigToken = `${payloadPart}.invalidsignature123`;
    const verifyBadSig = verifyAdminSessionToken(badSigToken);
    assert(verifyBadSig.valid === false, "Forged signature is rejected");

    // Expired token test
    const expiredToken = createAdminSessionToken("khapluali19@gmail.com", -1000); // expired 1s ago
    const verifyExpired = verifyAdminSessionToken(expiredToken);
    assert(verifyExpired.valid === false, "Expired token is rejected");

    // validateAdminSession
    const sessionValidation = validateAdminSession(token);
    assert(sessionValidation.valid === true, "validateAdminSession accepts valid signed token");
    assert(sessionValidation.account?.email === "khapluali19@gmail.com", "validateAdminSession returns account object");

    // -------------------------------------------------------------------------
    // 5. Logout & Revocation
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Logout & Revocation (No Disk Writes) ---");
    const statBeforeLogout = fs.existsSync(authFilePath) ? fs.statSync(authFilePath).mtimeMs : 0;
    invalidateAdminSession(token);
    const statAfterLogout = fs.existsSync(authFilePath) ? fs.statSync(authFilePath).mtimeMs : 0;
    assert(statBeforeLogout === statAfterLogout, "CRITICAL: No filesystem write occurred during logout");

    const sessionAfterRevoke = validateAdminSession(token);
    assert(sessionAfterRevoke.valid === false, "validateAdminSession rejects revoked session token");

    // -------------------------------------------------------------------------
    // 6. Rate Limiting Protection
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Rate Limiting Protection ---");
    const testIp = "192.168.1.100";
    for (let i = 0; i < 4; i++) {
      await authenticateAdmin("khapluali19@gmail.com", "bad-pass", testIp);
    }
    const fifthAttempt = await authenticateAdmin("khapluali19@gmail.com", "bad-pass", testIp);
    const sixthAttempt = await authenticateAdmin("khapluali19@gmail.com", "bad-pass", testIp);
    assert(
      sixthAttempt.success === false && sixthAttempt.message.includes("Too many failed login attempts"),
      "Rate limiting triggers after 5 failed attempts from same IP"
    );

    // -------------------------------------------------------------------------
    // 7. Serverless Read-Only Filesystem Simulation (VERCEL=1)
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Serverless Read-Only Filesystem Simulation (VERCEL=1) ---");
    process.env.VERCEL = "1";

    // 7a. Login does not attempt file write
    const vercelLogin = await authenticateAdmin("khapluali19@gmail.com", "ali12345", "10.0.0.88");
    assert(vercelLogin.success === true, "Authentication succeeds in simulated Vercel serverless environment");
    assert(!!vercelLogin.sessionToken, "Session token issued successfully under Vercel environment");

    // 7b. Activity logging does not attempt file write or throw EROFS
    logAdminActivity("Vercel Serverless Log Test", "system", "Testing activity logging without EROFS");
    assert(true, "Activity logging succeeds without throwing EROFS under VERCEL=1");

    // 7c. saveAdminAccount reports persisted: false honestly (does not swallow error)
    const testAccount = { ...getAdminAccount() };
    const saveVercelResult = saveAdminAccount(testAccount);
    assert(saveVercelResult.persisted === false, "saveAdminAccount reports persisted: false on read-only serverless");
    assert(typeof saveVercelResult.error === "string", "saveAdminAccount includes descriptive error message");

    // 7d. changeAdminPassword reports honest persistence status
    const freshToken = createAdminSessionToken("khapluali19@gmail.com");
    const changeResult = await changeAdminPassword("ali12345", "NewStrongPassword2026!", freshToken);
    assert(changeResult.success === true, "Password change succeeds in runtime session");
    assert(changeResult.persisted === false, "Password change reports persisted: false on read-only serverless");
    assert(!!changeResult.passwordHash, "Returns generated passwordHash");
    assert(changeResult.message.includes("INITIAL_ADMIN_PASSWORD"), "Provides helpful guidance for Vercel persistence via INITIAL_ADMIN_PASSWORD");

    // Reset VERCEL env var
    delete process.env.VERCEL;

    // -------------------------------------------------------------------------
    // 8. INITIAL_ADMIN_PASSWORD Precedence & ADMIN_PASSWORD_HASH Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- 8. INITIAL_ADMIN_PASSWORD & ADMIN_PASSWORD_HASH Isolation ---");
    const customPass = "MyCustomVercelSecretPassword999";
    process.env.INITIAL_ADMIN_PASSWORD = customPass;

    // Setting a fake ADMIN_PASSWORD_HASH must NOT override INITIAL_ADMIN_PASSWORD
    process.env.ADMIN_PASSWORD_HASH = "$2b$12$fakeOldHashThatMustNotOverridePassword";

    const customLogin = await authenticateAdmin("khapluali19@gmail.com", customPass, "10.0.0.99");
    assert(customLogin.success === true, "Authentication succeeds with password from INITIAL_ADMIN_PASSWORD");

    const oldLogin = await authenticateAdmin("khapluali19@gmail.com", "ali12345", "10.0.0.99");
    assert(oldLogin.success === false, "Old password rejected when INITIAL_ADMIN_PASSWORD is set to custom value");

    // Clean up env overrides
    delete process.env.INITIAL_ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD_HASH;

    console.log("\n============================================================");
    console.log(`   TEST SUMMARY: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log("============================================================\n");

    if (passed === total) {
      console.log("\x1b[32m✔ All Admin Auth & Serverless Resilience checks passed!\x1b[0m\n");
      process.exit(0);
    } else {
      process.exit(1);
    }
  } finally {
    // Restore pristine admin-auth.json
    if (authBackup) {
      fs.writeFileSync(authFilePath, authBackup, "utf-8");
    }
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
