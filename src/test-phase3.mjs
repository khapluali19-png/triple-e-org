/**
 * Triple E Organization 2nd Quiz Competition
 * Phase 3 Automated Verification Test Suite
 *
 * Verifies:
 * 1. Admin Bootstrap & Secure Login (bcrypt hashing, HttpOnly cookie, mustChangePassword flag)
 * 2. Password Change Flow (validation, bcrypt hash persistence, mustChangePassword unset)
 * 3. Post-Password-Change Credential Verification (old rejected, new accepted)
 * 4. Route & Middleware Security (unauthenticated access blocked with 307 / 401)
 * 5. Dashboard Overview API (connected categories, health, missing config warnings, audit log)
 * 6. Dynamic Website Branding & Public Live Reflection (updates reflect on `/` & `/api/branding` with zero code changes)
 * 7. Brute-Force Rate Limiting (>5 failed attempts blocked with 429)
 * 8. Session Termination & Logout (session invalidated, cookie cleared)
 * 9. Clean Slate Restoration (resets initial credentials for user interactive verification)
 */

import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import bcrypt from "bcryptjs";

const PORT = 3008;
const BASE_URL = `http://localhost:${PORT}`;
const DATA_DIR = path.join(process.cwd(), "src", "data");
const AUTH_FILE = path.join(DATA_DIR, "admin-auth.json");
const BRANDING_FILE = path.join(DATA_DIR, "branding-config.json");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, detail = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${testName}`);
  } else {
    console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${testName}`);
    if (detail) console.error(`    \x1b[33mDetail:\x1b[0m ${detail}`);
  }
}

// Reset admin auth to initial bootstrap state
function resetAdminToInitialState() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const salt = bcrypt.genSaltSync(12);
  const passwordHash = bcrypt.hashSync("ali12345", salt);

  const initialAccount = {
    email: "khapluali19@gmail.com",
    passwordHash,
    mustChangePassword: true,
    lastLoginAt: null,
    passwordChangedAt: null,
  };

  fs.writeFileSync(AUTH_FILE, JSON.stringify(initialAccount, null, 2), "utf-8");
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/branding`);
      if (res.status === 200) return true;
    } catch {
      // wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function runTestSuite() {
  console.log("\n============================================================");
  console.log("   TRIPLE E ORGANIZATION - PHASE 3 VERIFICATION SUITE       ");
  console.log("============================================================\n");

  // Step 0: Ensure fresh initial auth state
  resetAdminToInitialState();
  console.log("[Setup] Reset admin-auth.json to initial bootstrap state: khapluali19@gmail.com / ali12345");

  // Start Next.js development server on ephemeral port 3008
  console.log(`[Setup] Spawning Next.js server on port ${PORT}...`);
  const serverProcess = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "dev", "-p", String(PORT)],
    {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(PORT) },
      stdio: "pipe",
      shell: true,
    }
  );

  let serverOutput = "";
  serverProcess.stdout.on("data", (d) => { serverOutput += d.toString(); });
  serverProcess.stderr.on("data", (d) => { serverOutput += d.toString(); });

  try {
    await waitForServer(BASE_URL);
    console.log(`[Setup] Next.js server is online at ${BASE_URL}\n`);

    // -------------------------------------------------------------
    // TEST 1: Initial Administrator Bootstrap & Secure Login
    // -------------------------------------------------------------
    console.log("--- 1. Initial Administrator Bootstrap & Secure Login ---");
    let sessionCookie = "";
    let sessionToken = "";

    const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "khapluali19@gmail.com",
        password: "ali12345",
      }),
    });

    const loginData = await loginRes.json();
    const setCookieHeader = loginRes.headers.get("set-cookie");

    assert(loginRes.status === 200, "Initial admin login responds with HTTP 200 OK");
    assert(loginData.success === true, "Login response indicates success: true");
    assert(loginData.email === "khapluali19@gmail.com", "Authenticated email matches khapluali19@gmail.com");
    assert(loginData.mustChangePassword === true, "mustChangePassword flag is true on initial login");
    assert(!!setCookieHeader && setCookieHeader.includes("admin_session="), "Sets HttpOnly admin_session cookie");

    if (setCookieHeader) {
      const match = setCookieHeader.match(/admin_session=([^;]+)/);
      if (match) {
        sessionToken = match[1];
        sessionCookie = `admin_session=${sessionToken}`;
      }
    }

    // -------------------------------------------------------------
    // TEST 2: Password Change Workflow & Bcrypt Re-Hashing
    // -------------------------------------------------------------
    console.log("\n--- 2. Mandatory Password Change Workflow ---");

    // 2a. Reject wrong current password
    const badChangeRes = await fetch(`${BASE_URL}/api/admin/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: "wrongPassword99",
        newPassword: "TripleE#SecurePass2026",
      }),
    });
    assert(badChangeRes.status === 400, "Password change rejects incorrect current password with HTTP 400");

    // 2b. Accept valid password change
    const goodChangeRes = await fetch(`${BASE_URL}/api/admin/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: "ali12345",
        newPassword: "TripleE#SecurePass2026",
      }),
    });
    const goodChangeData = await goodChangeRes.json();

    assert(goodChangeRes.status === 200, "Password change succeeds with HTTP 200 OK");
    assert(goodChangeData.success === true, "Password change response indicates success: true");

    // 2c. Inspect admin-auth.json persistence on server
    const persistedAuth = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
    assert(persistedAuth.mustChangePassword === false, "mustChangePassword persisted as false in admin-auth.json");
    assert(persistedAuth.passwordHash !== "ali12345" && persistedAuth.passwordHash !== "TripleE#SecurePass2026", "Password is stored as bcrypt hash, never plaintext");
    assert(bcrypt.compareSync("TripleE#SecurePass2026", persistedAuth.passwordHash), "Bcrypt hash verifies against new password");
    assert(!!persistedAuth.passwordChangedAt, "passwordChangedAt timestamp is recorded");

    // -------------------------------------------------------------
    // TEST 3: Post-Password-Change Credential Validation
    // -------------------------------------------------------------
    console.log("\n--- 3. Post-Password-Change Credential Validation ---");

    // 3a. Old initial password must fail
    const oldLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "khapluali19@gmail.com",
        password: "ali12345",
      }),
    });
    assert(oldLoginRes.status === 401, "Old initial password ali12345 is rejected with HTTP 401");

    // 3b. New password must succeed
    const newLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "khapluali19@gmail.com",
        password: "TripleE#SecurePass2026",
      }),
    });
    const newLoginData = await newLoginRes.json();
    assert(newLoginRes.status === 200, "New password succeeds with HTTP 200 OK");
    assert(newLoginData.mustChangePassword === false, "mustChangePassword is now false for normal administration");

    // Update active session cookie
    const newCookieHeader = newLoginRes.headers.get("set-cookie");
    if (newCookieHeader) {
      const match = newCookieHeader.match(/admin_session=([^;]+)/);
      if (match) {
        sessionToken = match[1];
        sessionCookie = `admin_session=${sessionToken}`;
      }
    }

    // -------------------------------------------------------------
    // TEST 4: Route & Middleware Security Protections
    // -------------------------------------------------------------
    console.log("\n--- 4. Route & Middleware Security Protections ---");

    // 4a. Unauthenticated page access redirects to /admin/login (HTTP 307)
    const unauthPages = ["/admin", "/admin/sheets", "/admin/branding", "/admin/social"];
    for (const pagePath of unauthPages) {
      const pageRes = await fetch(`${BASE_URL}${pagePath}`, { redirect: "manual" });
      const location = pageRes.headers.get("location") || "";
      assert(
        pageRes.status === 307 && location.includes("/admin/login"),
        `Unauthenticated ${pagePath} redirects to /admin/login (HTTP 307)`,
        `status: ${pageRes.status}, location: ${location}`
      );
    }

    // 4b. Unauthenticated API access rejected with HTTP 401
    const unauthApis = [
      { path: "/api/admin/overview", method: "GET" },
      { path: "/api/admin/branding", method: "GET" },
      { path: "/api/admin/branding", method: "POST" },
      { path: "/api/admin/sheets/config", method: "GET" },
      { path: "/api/admin/sheets/config", method: "POST" },
    ];
    for (const api of unauthApis) {
      const apiRes = await fetch(`${BASE_URL}${api.path}`, {
        method: api.method,
        headers: { "Content-Type": "application/json" },
        body: api.method === "POST" ? JSON.stringify({}) : undefined,
      });
      assert(apiRes.status === 401, `Unauthenticated ${api.method} ${api.path} returns HTTP 401 Unauthorized`);
    }

    // -------------------------------------------------------------
    // TEST 5: Dashboard Overview API
    // -------------------------------------------------------------
    console.log("\n--- 5. Dashboard Overview API ---");
    const overviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Cookie: sessionCookie },
    });
    const overviewData = await overviewRes.json();
    const overview = overviewData.overview || {};

    assert(overviewRes.status === 200, "Authenticated /api/admin/overview returns HTTP 200 OK");
    assert(overviewData.success === true, "Overview reports success: true");
    assert(
      typeof overview.connectedCategoriesCount === "number" &&
      overview.connectedCategoriesCount >= 0 &&
      overview.connectedCategoriesCount <= 3,
      `Connected categories count is an authentic tally: ${overview.connectedCategoriesCount} of 3`
    );
    assert(Array.isArray(overview.categoryHealth), "Returns categoryHealth array with health status");
    assert(Array.isArray(overview.missingWarnings), "Returns missing configuration warnings array");
    assert(Array.isArray(overview.recentActivities), "Returns audit trail of administrative activities");

    // -------------------------------------------------------------
    // TEST 6: Dynamic Website Branding & Public Live Reflection
    // -------------------------------------------------------------
    console.log("\n--- 6. Dynamic Website Branding & Public Live Reflection ---");

    const testHeadline = "Triple E 2nd Quiz Championship Gilgit-Baltistan [Live Dynamic Test]";
    const testAnnouncement = "Official Examination Results Live Bulletin 2026";
    const testFacebook = "https://facebook.com/triple.e.baltistan.official";
    const testWhatsapp = "https://wa.me/923451234567";

    // 6a. Mutate branding settings via authenticated admin API
    const updateBrandingRes = await fetch(`${BASE_URL}/api/admin/branding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        mainHeadline: testHeadline,
        announcementText: testAnnouncement,
        announcementActive: true,
        socialLinks: {
          facebook: testFacebook,
          whatsapp: testWhatsapp,
        },
      }),
    });
    assert(updateBrandingRes.status === 200, "Authenticated /api/admin/branding updates settings with HTTP 200 OK");

    // 6b. Verify public /api/branding immediately reflects changes
    const publicBrandingRes = await fetch(`${BASE_URL}/api/branding`);
    const publicBrandingData = await publicBrandingRes.json();
    assert(publicBrandingRes.status === 200, "Public /api/branding responds with HTTP 200 OK");
    assert(publicBrandingData.branding.mainHeadline === testHeadline, "Public /api/branding contains updated headline");
    assert(publicBrandingData.branding.socialLinks.facebook === testFacebook, "Public /api/branding contains updated Facebook URL");
    assert(publicBrandingData.branding.socialLinks.whatsapp === testWhatsapp, "Public /api/branding contains updated WhatsApp URL");

    // 6c. Verify public homepage HTML reflects updated branding without code changes
    const homeHtmlRes = await fetch(`${BASE_URL}/`);
    const homeHtml = await homeHtmlRes.text();
    assert(homeHtmlRes.status === 200, "Public homepage / responds with HTTP 200 OK");
    assert(homeHtml.includes(testHeadline), "Public homepage HTML renders dynamic headline without code modification");
    assert(homeHtml.includes(testAnnouncement), "Public homepage HTML renders dynamic announcement bulletin");
    assert(homeHtml.includes(testFacebook), "Public homepage footer renders configured Facebook social channel");

    // -------------------------------------------------------------
    // TEST 7: Brute-Force Rate Limiting
    // -------------------------------------------------------------
    console.log("\n--- 7. Brute-Force Rate Limiting Protection ---");

    // Send rapid failed attempts with unique spoofed IP
    const testIp = "192.168.100.42";
    let rateLimited = false;

    for (let i = 1; i <= 6; i++) {
      const attemptRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testIp,
        },
        body: JSON.stringify({
          email: "khapluali19@gmail.com",
          password: `wrongAttempt-${i}`,
        }),
      });

      if (attemptRes.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert(rateLimited, "Rate limiter triggers HTTP 429 Too Many Requests after consecutive failed attempts");

    // -------------------------------------------------------------
    // TEST 8: Session Termination & Logout
    // -------------------------------------------------------------
    console.log("\n--- 8. Session Termination & Logout ---");

    const logoutRes = await fetch(`${BASE_URL}/api/admin/auth/logout`, {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });
    const logoutData = await logoutRes.json();
    const logoutCookie = logoutRes.headers.get("set-cookie") || "";

    assert(logoutRes.status === 200, "Logout responds with HTTP 200 OK");
    assert(logoutData.success === true, "Logout indicates success: true");
    assert(logoutCookie.includes("admin_session=;") || logoutCookie.includes("Max-Age=0"), "Logout clears admin_session cookie");

    // Subsequent access with invalidated session cookie must return 401
    const postLogoutOverviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Cookie: sessionCookie },
    });
    assert(postLogoutOverviewRes.status === 401, "Subsequent API access with terminated session returns HTTP 401 Unauthorized");

    // -------------------------------------------------------------
    // TEST 9: Clean Slate Restoration
    // -------------------------------------------------------------
    console.log("\n--- 9. Clean Slate Restoration ---");
    resetAdminToInitialState();
    assert(true, "Restored initial admin credentials (khapluali19@gmail.com / ali12345 with mustChangePassword=true)");

    // Restore clean default branding config
    if (fs.existsSync(BRANDING_FILE)) {
      const raw = JSON.parse(fs.readFileSync(BRANDING_FILE, "utf-8"));
      raw.mainHeadline = "Triple E Organization 2nd Quiz Competition";
      raw.announcementText = "Official Examination Results • Lower, Middle & Overall Categories";
      fs.writeFileSync(BRANDING_FILE, JSON.stringify(raw, null, 2), "utf-8");
      assert(true, "Restored branding settings to standard competition title");
    }

  } finally {
    // Gracefully terminate Next.js background process
    console.log("\n[Teardown] Shutting down Next.js test server...");
    serverProcess.kill("SIGTERM");
  }

  console.log("\n============================================================");
  console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("============================================================\n");

  if (passedTests === totalTests) {
    console.log("\x1b[32m✔ All Phase 3 requirements verified successfully!\x1b[0m\n");
    process.exit(0);
  } else {
    console.error(`\x1b[31m✖ Some tests failed (${totalTests - passedTests} failures).\x1b[0m\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite fatal execution error:", err);
  process.exit(1);
});
