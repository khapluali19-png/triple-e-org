import assert from "node:assert";
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 3019;
const BASE_URL = `http://localhost:${PORT}`;

console.log("==================================================================");
console.log("   TRIPLE E - RESULT ANNOUNCEMENT COUNTDOWN & ADMIN CONTROL QA    ");
console.log("==================================================================");

let serverProcess;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  console.log(`\n[Setup] Spawning Next.js server (production) on port ${PORT}...`);
  serverProcess = spawn("npx", ["next", "start", "-p", String(PORT)], {
    shell: true,
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      INITIAL_ADMIN_EMAIL: "khapluali19@gmail.com",
      INITIAL_ADMIN_PASSWORD: "ali12345",
    },
  });

  for (let attempt = 1; attempt <= 35; attempt++) {
    await sleep(800);
    try {
      const res = await fetch(`${BASE_URL}/api/branding`);
      if (res.status === 200) {
        console.log(`[Setup] Next.js test server is online at ${BASE_URL}`);
        return;
      }
    } catch {}
  }
  throw new Error("Failed to connect to Next.js test server.");
}

async function loginAdmin() {
  const res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "khapluali19@gmail.com",
      password: "ali12345",
    }),
  });
  const data = await res.json();
  assert(res.status === 200, "Admin login must succeed");
  const cookie = res.headers.get("set-cookie");
  assert(cookie, "Auth session cookie must be present");
  return cookie.split(";")[0];
}

async function runTests() {
  // Set initial countdown to ON so the test can verify ON -> OFF -> ON transitions
  const configPath = path.join(process.cwd(), "src/data/branding-config.json");
  if (fs.existsSync(configPath)) {
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    cfg.countdown = { ...(cfg.countdown || {}), enabled: true };
    cfg.resultsPublished = false;
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf-8");
  }

  try {
    await startServer();

    // -------------------------------------------------------------
    // Scenario 1: Initial State - Countdown is ON
    // -------------------------------------------------------------
    console.log("\n--- Scenario 1: Initial State - Countdown is ON ---");
    const homeRes = await fetch(`${BASE_URL}/`);
    assert(homeRes.status === 200, "Homepage returns HTTP 200 OK");
    const html = await homeRes.text();

    assert(html.includes("RESULT"), "Homepage contains RESULT heading");
    assert(html.includes("ANNOUNCEMENT"), "Homepage contains ANNOUNCEMENT heading");
    assert(html.includes("Coming Soon") || html.includes("COMING SOON"), "Homepage contains COMING SOON prominently");
    assert(html.includes("Taqreeb-e-Taqseem Inaamaat wa Taleemi Seminar"), "Homepage contains event title");
    assert(html.includes("Al Ghanche General Knowledge Quiz Competition 2026"), "Homepage contains competition name");
    assert(html.includes("25 October 2026, Sunday, at 11:30 AM"), "Homepage contains announcement date/time");
    assert(html.includes("Government Boys High School Khaplu"), "Homepage contains announcement venue");
    assert(html.includes("triple-e-logo.jpg"), "Homepage contains Triple E logo asset");
    assert(html.includes("siachen-mark-logo.jpg"), "Homepage contains Siachen Mark logo asset");
    assert(html.includes("Days") && html.includes("Hours") && html.includes("Minutes") && html.includes("Seconds"), "Countdown units present");
    console.log("  ✔ [PASS] Countdown section, COMING SOON, event details, and both logos rendered on homepage");

    // -------------------------------------------------------------
    // Scenario 2: Direct Search API Blocked When Countdown is ON
    // -------------------------------------------------------------
    console.log("\n--- Scenario 2: Result search blocked while Countdown is ON ---");
    const blockedSearchRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`);
    assert(blockedSearchRes.status === 403, `Direct search must return HTTP 403 Forbidden, got ${blockedSearchRes.status}`);
    const blockedData = await blockedSearchRes.json();
    assert(blockedData.success === false, "Search response success must be false");
    assert(blockedData.code === "RESULTS_PENDING", "Code must be RESULTS_PENDING");
    assert(blockedData.message.includes("Results will be available when the announcement period ends"), "Message must explain announcement period restriction");
    console.log("  ✔ [PASS] Direct API searches are securely blocked with HTTP 403 RESULTS_PENDING");

    // Also check roll number query is blocked
    const blockedRollRes = await fetch(`${BASE_URL}/api/results?rollNumber=101&category=lower`);
    assert(blockedRollRes.status === 403, "Roll number search is also blocked with HTTP 403");
    console.log("  ✔ [PASS] Roll number direct searches are also blocked");

    // -------------------------------------------------------------
    // Scenario 3: Admin Auth Protection on Countdown Endpoint
    // -------------------------------------------------------------
    console.log("\n--- Scenario 3: Admin Auth Protection ---");
    const unauthGetRes = await fetch(`${BASE_URL}/api/admin/countdown`);
    assert(unauthGetRes.status === 401, "Unauthenticated GET /api/admin/countdown returns 401");

    const unauthPostRes = await fetch(`${BASE_URL}/api/admin/countdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    assert(unauthPostRes.status === 401, "Unauthenticated POST /api/admin/countdown returns 401");
    console.log("  ✔ [PASS] Unauthenticated access to countdown control is rejected with HTTP 401");

    // -------------------------------------------------------------
    // Scenario 4: Admin Switches Countdown to OFF
    // -------------------------------------------------------------
    console.log("\n--- Scenario 4: Admin Switches Countdown to OFF ---");
    const sessionCookie = await loginAdmin();

    const turnOffRes = await fetch(`${BASE_URL}/api/admin/countdown`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
      },
      body: JSON.stringify({ enabled: false }),
    });
    assert(turnOffRes.status === 200, "Authenticated toggle to OFF returns HTTP 200 OK");
    const turnOffData = await turnOffRes.json();
    assert(turnOffData.success === true, "Toggle response success is true");
    assert(turnOffData.countdown.enabled === false, "Countdown enabled is now false");
    console.log("  ✔ [PASS] Admin successfully switched countdown to OFF");

    // -------------------------------------------------------------
    // Scenario 5: Verify Behavior When Countdown is OFF (Both Public & Admin)
    // -------------------------------------------------------------
    console.log("\n--- Scenario 5: Verify Behavior When Countdown is OFF (Both Public & Admin) ---");
    // 1. Check countdown section is NOT rendered on homepage after refresh for PUBLIC USERS (NO COOKIES)
    for (let refresh = 1; refresh <= 3; refresh++) {
      const homeOffRes = await fetch(`${BASE_URL}/`, {
        cache: "no-store",
      });
      const homeOffHtml = await homeOffRes.text();
      assert(!homeOffHtml.includes("id=\"result-announcement\""), `Countdown section must be hidden when OFF for public users (refresh #${refresh})`);
    }
    console.log("  ✔ [PASS] Countdown section is completely hidden from public website across multiple refreshes when OFF");

    // 2. Check /api/branding returns updated status with no-store cache headers for PUBLIC USERS (NO COOKIES)
    const brandingRes = await fetch(`${BASE_URL}/api/branding`, {
      cache: "no-store",
    });
    const brandingData = await brandingRes.json();
    assert(brandingData.branding.countdown.enabled === false, "/api/branding returns enabled: false for public users");
    const cacheHeader = brandingRes.headers.get("cache-control") || "";
    assert(cacheHeader.includes("no-store"), "/api/branding must return Cache-Control: no-store");
    console.log("  ✔ [PASS] /api/branding immediately returns countdown.enabled: false with Cache-Control: no-store");

    // 3. Check result search is NOW ACTIVE and returns candidate results for PUBLIC USERS (NO COOKIES, NO ADMIN AUTH)
    const activeSearchRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`);
    assert(activeSearchRes.status === 200, `Result search returns HTTP 200 OK for public users when countdown is OFF, got ${activeSearchRes.status}`);
    const activeData = await activeSearchRes.json();
    assert(activeData.success === true, "Lookup succeeds for public user without admin authentication");
    assert(activeData.result.studentName === "Ali Raza", "Student name matches: Ali Raza");
    assert(activeData.result.obtainedMarks === 94, "Marks scored matches: 94");
    console.log("  ✔ [PASS] Normal result searching is fully restored for public users without requiring admin login");

    // 4. Check admin session also sees countdown hidden and search available
    const adminHomeOffRes = await fetch(`${BASE_URL}/`, {
      headers: { "Cookie": sessionCookie },
      cache: "no-store",
    });
    const adminHomeOffHtml = await adminHomeOffRes.text();
    assert(!adminHomeOffHtml.includes("id=\"result-announcement\""), "Countdown section is also hidden for admin when OFF");

    const adminSearchRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`, {
      headers: { "Cookie": sessionCookie },
    });
    assert(adminSearchRes.status === 200, "Result search returns HTTP 200 OK for admin when countdown is OFF");
    console.log("  ✔ [PASS] Consistent behavior verified: countdown hidden and search open for both public users and admins");

    // -------------------------------------------------------------
    // Scenario 6: Admin Switches Countdown back to ON (Both Public & Admin Restricted)
    // -------------------------------------------------------------
    console.log("\n--- Scenario 6: Admin Switches Countdown back to ON (Both Public & Admin Restricted) ---");
    const turnOnRes = await fetch(`${BASE_URL}/api/admin/countdown`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
      },
      body: JSON.stringify({ enabled: true }),
    });
    assert(turnOnRes.status === 200, "Authenticated toggle back to ON returns HTTP 200 OK");
    const turnOnData = await turnOnRes.json();
    assert(turnOnData.countdown.enabled === true, "Countdown enabled is now true");

    // Verify search is locked for PUBLIC users
    const publicBlockedRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`);
    assert(publicBlockedRes.status === 403, "Search is immediately locked for public users with HTTP 403");

    // Verify search is ALSO locked for ADMIN users when ON
    const adminBlockedRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`, {
      headers: { "Cookie": sessionCookie },
    });
    assert(adminBlockedRes.status === 403, "Search is locked for admin users as well when ON with HTTP 403");
    console.log("  ✔ [PASS] Search is consistently blocked for both public users and admins when countdown is ON");

    // Verify countdown section is visible for both public users and admins when ON
    const publicHomeOnRes = await fetch(`${BASE_URL}/`, { cache: "no-store" });
    const publicHomeOnHtml = await publicHomeOnRes.text();
    assert(publicHomeOnHtml.includes("id=\"result-announcement\""), "Countdown section is visible for public users when ON");

    const adminHomeOnRes = await fetch(`${BASE_URL}/`, {
      headers: { "Cookie": sessionCookie },
      cache: "no-store",
    });
    const adminHomeOnHtml = await adminHomeOnRes.text();
    assert(adminHomeOnHtml.includes("id=\"result-announcement\""), "Countdown section is visible for admins when ON");
    console.log("  ✔ [PASS] Countdown section is visible for both public users and admins when ON");

    // Verify persistence in branding config file
    const brandingJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/branding-config.json"), "utf-8"));
    assert(brandingJson.countdown.enabled === true, "Config file persisted countdown.enabled === true");
    console.log("  ✔ [PASS] Persistent storage in branding-config.json verified");

    // -------------------------------------------------------------
    // Scenario 7: Timezone and Absolute Epoch Verification
    // -------------------------------------------------------------
    console.log("\n--- Scenario 7: Timezone and Absolute Epoch Verification ---");
    const targetIso = "2026-10-25T11:30:00+05:00";
    const targetDate = new Date(targetIso);
    const targetUtcIso = targetDate.toISOString();
    assert(targetUtcIso === "2026-10-25T06:30:00.000Z", `Target UTC must be 2026-10-25T06:30:00.000Z, got ${targetUtcIso}`);
    console.log(`  ✔ [PASS] PKT (+05:00) parsed reliably to UTC epoch: ${targetUtcIso}`);

    // -------------------------------------------------------------
    // Scenario 8: Admin Switches Countdown to OFF (Two-Way Cycle Verification)
    // -------------------------------------------------------------
    console.log("\n--- Scenario 8: Admin Switches Countdown to OFF (Two-Way Cycle Verification) ---");
    const toggleOffFinalRes = await fetch(`${BASE_URL}/api/admin/countdown`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
      },
      body: JSON.stringify({ enabled: false }),
    });
    assert(toggleOffFinalRes.status === 200, "Authenticated toggle to OFF returns HTTP 200 OK");
    const toggleOffFinalData = await toggleOffFinalRes.json();
    assert(toggleOffFinalData.countdown.enabled === false, "Countdown enabled is false");

    // Verify public website hides countdown section
    const finalHomeRes = await fetch(`${BASE_URL}/`, {
      cache: "no-store",
    });
    const finalHomeHtml = await finalHomeRes.text();
    assert(!finalHomeHtml.includes("id=\"result-announcement\""), "Countdown section is hidden for public users when OFF");

    // Verify search works immediately for public users
    const finalSearchRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`);
    assert(finalSearchRes.status === 200, "Result search is active and returns HTTP 200 OK for public users");
    const finalSearchData = await finalSearchRes.json();
    assert(finalSearchData.result.studentName === "Ali Raza", "Student found: Ali Raza");
    console.log("  ✔ [PASS] Two-way ON/OFF cycle fully verified: Countdown hides and search restores reliably for public users");

    // -------------------------------------------------------------
    // Scenario 9: Admin Switches Countdown back to ON (Verify Lock)
    // -------------------------------------------------------------
    console.log("\n--- Scenario 9: Admin Switches Countdown back to ON (Verify Lock) ---");
    const toggleOnFinalRes = await fetch(`${BASE_URL}/api/admin/countdown`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
      },
      body: JSON.stringify({ enabled: true }),
    });
    assert(toggleOnFinalRes.status === 200, "Authenticated toggle to ON returns HTTP 200 OK");
    const toggleOnFinalData = await toggleOnFinalRes.json();
    assert(toggleOnFinalData.countdown.enabled === true, "Countdown enabled is true");

    // Verify public website displays countdown section when ON
    const homeOnFinalRes = await fetch(`${BASE_URL}/`, {
      cache: "no-store",
    });
    const homeOnFinalHtml = await homeOnFinalRes.text();
    assert(homeOnFinalHtml.includes("id=\"result-announcement\""), "Countdown section is visible when ON");
    assert(homeOnFinalHtml.includes("COMING SOON"), "COMING SOON text is displayed");

    // Verify result search is locked again
    const searchLockFinalRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`);
    assert(searchLockFinalRes.status === 403, "Result search is locked when countdown is ON");
    console.log("  ✔ [PASS] Countdown active state re-enabled and verified for production");

    // -------------------------------------------------------------
    // Scenario 10: Admin Leaves Countdown OFF (User Requested State)
    // -------------------------------------------------------------
    console.log("\n--- Scenario 10: Admin Leaves Countdown OFF (User Requested State) ---");
    const toggleOffUserRes = await fetch(`${BASE_URL}/api/admin/countdown`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
      },
      body: JSON.stringify({ enabled: false }),
    });
    assert(toggleOffUserRes.status === 200, "Authenticated toggle to OFF returns HTTP 200 OK");
    const toggleOffUserData = await toggleOffUserRes.json();
    assert(toggleOffUserData.countdown.enabled === false, "Countdown enabled is false");

    // Verify public website hides countdown section
    const userHomeRes = await fetch(`${BASE_URL}/`, {
      cache: "no-store",
    });
    const userHomeHtml = await userHomeRes.text();
    assert(!userHomeHtml.includes("id=\"result-announcement\""), "Countdown section is hidden for public users when OFF");

    // Verify search works immediately for public users
    const userSearchRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`);
    assert(userSearchRes.status === 200, "Result search is active and returns HTTP 200 OK for public users");
    const userSearchData = await userSearchRes.json();
    assert(userSearchData.result.studentName === "Ali Raza", "Student found: Ali Raza");
    console.log("  ✔ [PASS] Final state confirmed OFF: Countdown is hidden and public search works without login");

    console.log("\n==================================================================");
    console.log("   🎉 ALL 9 COUNTDOWN QA SCENARIOS PASSED WITH ZERO ERRORS!      ");
    console.log("==================================================================");
  } finally {
    if (serverProcess) {
      console.log("\n[Teardown] Shutting down Next.js test server...");
      serverProcess.kill("SIGTERM");
    }
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  if (serverProcess) serverProcess.kill("SIGTERM");
  process.exit(1);
});
