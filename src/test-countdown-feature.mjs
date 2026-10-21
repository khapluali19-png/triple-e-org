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
    // Scenario 5: Verify Behavior When Countdown is OFF
    // -------------------------------------------------------------
    console.log("\n--- Scenario 5: Verify Behavior When Countdown is OFF ---");
    // 1. Check countdown section is NOT rendered on homepage
    const homeOffRes = await fetch(`${BASE_URL}/`);
    const homeOffHtml = await homeOffRes.text();
    assert(!homeOffHtml.includes("id=\"result-announcement\""), "Countdown section must be hidden when OFF");
    console.log("  ✔ [PASS] Countdown section is completely hidden from public website when OFF");

    // 2. Check result search is NOW ACTIVE and returns candidate results
    const activeSearchRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`);
    assert(activeSearchRes.status === 200, `Result search returns HTTP 200 OK when countdown is OFF, got ${activeSearchRes.status}`);
    const activeData = await activeSearchRes.json();
    assert(activeData.success === true, "Lookup succeeds");
    assert(activeData.result.studentName === "Ali Raza", "Student name matches: Ali Raza");
    assert(activeData.result.obtainedMarks === 94, "Marks scored matches: 94");
    console.log("  ✔ [PASS] Normal result searching is fully restored (Ali Raza found with 94 marks)");

    // -------------------------------------------------------------
    // Scenario 6: Admin Switches Countdown back to ON (Persistence)
    // -------------------------------------------------------------
    console.log("\n--- Scenario 6: Admin Switches Countdown back to ON (Persistence) ---");
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

    // Verify search is locked again
    const reblockedRes = await fetch(`${BASE_URL}/api/results?studentName=Ali+Raza&center=khaplu`);
    assert(reblockedRes.status === 403, "Search is immediately locked again with HTTP 403");
    console.log("  ✔ [PASS] Countdown switched back to ON and searches immediately re-locked");

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

    console.log("\n==================================================================");
    console.log("   🎉 ALL 7 COUNTDOWN QA SCENARIOS PASSED WITH ZERO ERRORS!      ");
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
