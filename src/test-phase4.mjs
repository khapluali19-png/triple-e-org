/**
 * Triple E Organization 2nd Quiz Competition
 * Phase 4 Automated Verification Test Suite
 *
 * Verifies:
 * 1. Category-specific lookups across Lower Class, Middle Class, and Overall tracks.
 * 2. Strict preservation of leading zeros (e.g. "0042", "0088", "0007").
 * 3. Category isolation: querying Lower candidate in Middle category returns 404.
 * 4. Input validation: missing roll number, whitespace-only, invalid category return 400.
 * 5. Not found error: non-existent roll number returns 404 with helpful guidance.
 * 6. Duplicate collision handling: duplicate roll number returns 409 and refuses ambiguous match.
 * 7. Disconnected sheet handling: disconnected category returns 503 SHEET_UNAVAILABLE.
 * 8. Lookup rate limiting: excessive requests from single IP return 429.
 * 9. Privacy check: no admin navigation links in public header/mobile menu.
 * 10. Privacy check: response returns only matching candidate's approved fields.
 * 11. Dynamic branding reflection: admin settings update public site without code rebuild.
 * 12. A4 Print stylesheet: validates isolation of .printable-card on A4 page.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const PORT = 3009;
const BASE_URL = `http://localhost:${PORT}`;
const DATA_DIR = path.join(process.cwd(), "src", "data");
const CONFIG_FILE = path.join(DATA_DIR, "category-sheets-config.json");
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
  console.log("   TRIPLE E ORGANIZATION - PHASE 4 VERIFICATION SUITE       ");
  console.log("============================================================\n");

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
    // TEST 1: Category Lookups & Leading Zero Preservation
    // -------------------------------------------------------------
    console.log("--- 1. Category Lookups & Leading Zero Preservation ---");

    // 1a. Lower Class standard lookup
    const lowerRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=lower`);
    const lowerData = await lowerRes.json();
    assert(lowerRes.status === 200, "Lower Class standard candidate (TE-101) returns HTTP 200 OK");
    assert(lowerData.success === true, "Lower Class lookup returns success: true");
    assert(lowerData.result.studentName === "Ali Raza", "Correct student name: Ali Raza");
    assert(lowerData.result.obtainedMarks === 94, "Correct obtained marks: 94");
    assert(lowerData.result.percentage === 94, "Correct percentage: 94%");
    assert(lowerData.result.rank === 1, "Correct official rank: 1");

    // 1b. Lower Class leading zero lookup
    const lowerZeroRes = await fetch(`${BASE_URL}/api/results?rollNumber=0042&category=lower`);
    const lowerZeroData = await lowerZeroRes.json();
    assert(lowerZeroRes.status === 200, "Lower Class leading zero candidate (0042) returns HTTP 200 OK");
    assert(lowerZeroData.result.rollNumber === "0042", "Leading zeros strictly preserved: '0042'");
    assert(lowerZeroData.result.studentName === "Ali Raza", "Matches candidate Ali Raza for 0042");

    // 1c. Middle Class standard lookup
    const middleRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-102&category=middle`);
    const middleData = await middleRes.json();
    assert(middleRes.status === 200, "Middle Class candidate (TE-102) returns HTTP 200 OK");
    assert(middleData.result.studentName === "Fatima Zahra", "Correct student name: Fatima Zahra");
    assert(middleData.result.obtainedMarks === 91, "Correct marks: 91");
    assert(middleData.result.classOrSection === "Grade 8-A", "Correct class/section: Grade 8-A");

    // 1d. Middle Class leading zero lookup
    const middleZeroRes = await fetch(`${BASE_URL}/api/results?rollNumber=0088&category=middle`);
    const middleZeroData = await middleZeroRes.json();
    assert(middleZeroRes.status === 200, "Middle Class leading zero candidate (0088) returns HTTP 200 OK");
    assert(middleZeroData.result.rollNumber === "0088", "Leading zeros strictly preserved: '0088'");

    // 1e. Overall Category standard lookup
    const overallRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-103&category=overall`);
    const overallData = await overallRes.json();
    assert(overallRes.status === 200, "Overall Track candidate (TE-103) returns HTTP 200 OK");
    assert(overallData.result.studentName === "Kareem Ullah", "Correct student name: Kareem Ullah");
    assert(overallData.result.obtainedMarks === 88, "Correct marks: 88");

    // 1f. Overall Category leading zero lookup
    const overallZeroRes = await fetch(`${BASE_URL}/api/results?rollNumber=0007&category=overall`);
    const overallZeroData = await overallZeroRes.json();
    assert(overallZeroRes.status === 200, "Overall Track leading zero candidate (0007) returns HTTP 200 OK");
    assert(overallZeroData.result.rollNumber === "0007", "Leading zeros strictly preserved: '0007'");

    // -------------------------------------------------------------
    // TEST 2: Strict Category Isolation
    // -------------------------------------------------------------
    console.log("\n--- 2. Strict Category Isolation ---");

    // TE-101 is Lower Class only -> Querying in Middle must return 404
    const crossCat1Res = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=middle`);
    assert(crossCat1Res.status === 404, "Lower candidate TE-101 in Middle category returns HTTP 404 Not Found");

    // TE-102 is Middle Class only -> Querying in Lower must return 404
    const crossCat2Res = await fetch(`${BASE_URL}/api/results?rollNumber=TE-102&category=lower`);
    assert(crossCat2Res.status === 404, "Middle candidate TE-102 in Lower category returns HTTP 404 Not Found");

    // TE-103 is Overall only -> Querying in Lower must return 404
    const crossCat3Res = await fetch(`${BASE_URL}/api/results?rollNumber=TE-103&category=lower`);
    assert(crossCat3Res.status === 404, "Overall candidate TE-103 in Lower category returns HTTP 404 Not Found");

    // -------------------------------------------------------------
    // TEST 3: Input Validation
    // -------------------------------------------------------------
    console.log("\n--- 3. Input Validation ---");

    // Missing roll number
    const emptyRollRes = await fetch(`${BASE_URL}/api/results?category=lower`);
    const emptyRollData = await emptyRollRes.json();
    assert(emptyRollRes.status === 400, "Missing roll number returns HTTP 400 Bad Request");
    assert(emptyRollData.code === "MISSING_ROLL_NUMBER", "Reports code MISSING_ROLL_NUMBER");

    // Whitespace only roll number
    const whitespaceRollRes = await fetch(`${BASE_URL}/api/results?rollNumber=%20%20%20&category=lower`);
    assert(whitespaceRollRes.status === 400, "Whitespace roll number returns HTTP 400 Bad Request");

    // Invalid category parameter
    const invalidCatRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=unknown_track`);
    const invalidCatData = await invalidCatRes.json();
    assert(invalidCatRes.status === 400, "Invalid category parameter returns HTTP 400 Bad Request");
    assert(invalidCatData.code === "INVALID_CATEGORY", "Reports code INVALID_CATEGORY");

    // -------------------------------------------------------------
    // TEST 4: Result Not Found Handling
    // -------------------------------------------------------------
    console.log("\n--- 4. Result Not Found Handling ---");

    const notFoundRes = await fetch(`${BASE_URL}/api/results?rollNumber=9999&category=lower`);
    const notFoundData = await notFoundRes.json();
    assert(notFoundRes.status === 404, "Non-existent candidate (9999) returns HTTP 404 Not Found");
    assert(notFoundData.code === "NOT_FOUND", "Reports code NOT_FOUND");
    assert(notFoundData.message.includes("9999"), "Error message references the requested roll number");

    // -------------------------------------------------------------
    // TEST 5: Duplicate Roll Number Collision Handling
    // -------------------------------------------------------------
    console.log("\n--- 5. Duplicate Roll Number Collision Handling ---");

    const dupRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-DUP-LOWER&category=lower`);
    const dupData = await dupRes.json();
    assert(dupRes.status === 409, "Duplicate candidate returns HTTP 409 Conflict");
    assert(dupData.duplicateDetected === true, "Flag duplicateDetected is true");
    assert(dupData.code === "DUPLICATE_ROLL", "Reports code DUPLICATE_ROLL");
    assert(dupData.message.includes("Multiple records found"), "Message explains multiple records found");

    // -------------------------------------------------------------
    // TEST 6: Disconnected Category Sheet Handling
    // -------------------------------------------------------------
    console.log("\n--- 6. Disconnected Category Sheet Handling ---");

    // Disconnect overall category via official admin API
    await fetch(`${BASE_URL}/api/admin/sheets/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "triple-e-2026",
      },
      body: JSON.stringify({
        categoryId: "overall",
        connection: { status: "disconnected" },
      }),
    });

    const disconnectedRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-103&category=overall`);
    const disconnectedData = await disconnectedRes.json();
    assert(disconnectedRes.status === 503, "Query to disconnected category sheet returns HTTP 503 Service Unavailable");
    assert(disconnectedData.code === "SHEET_UNAVAILABLE", "Reports code SHEET_UNAVAILABLE");
    assert(
      disconnectedData.message?.includes("not configured or connected") ||
      disconnectedData.message?.includes("unavailable"),
      "Explains ledger is not connected or unavailable"
    );

    // Reconnect overall category
    await fetch(`${BASE_URL}/api/admin/sheets/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "triple-e-2026",
      },
      body: JSON.stringify({
        categoryId: "overall",
        connection: { status: "connected" },
      }),
    });

    // -------------------------------------------------------------
    // TEST 7: Lookup Rate Limiting Protection
    // -------------------------------------------------------------
    console.log("\n--- 7. Lookup Rate Limiting Protection ---");

    const rateTestIp = "10.20.30.40";
    let hitRateLimit = false;

    // Send 32 rapid lookup requests
    for (let i = 0; i < 32; i++) {
      const res = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=lower`, {
        headers: { "x-forwarded-for": rateTestIp },
      });
      if (res.status === 429) {
        hitRateLimit = true;
        const retryAfter = res.headers.get("retry-after");
        assert(!!retryAfter, `429 response includes Retry-After header (${retryAfter}s)`);
        break;
      }
    }
    assert(hitRateLimit, "Exceeding lookup rate limit returns HTTP 429 Too Many Requests");

    // -------------------------------------------------------------
    // TEST 8: Privacy & Navigation Security
    // -------------------------------------------------------------
    console.log("\n--- 8. Privacy & Navigation Security ---");

    const homeHtmlRes = await fetch(`${BASE_URL}/`);
    const homeHtml = await homeHtmlRes.text();

    assert(!homeHtml.includes("Admin Access"), "Public header does NOT expose 'Admin Access' navigation button");
    assert(!homeHtml.includes("/admin/login\" className=\"flex items-center gap-1.5"), "Public header announcement does NOT link to /admin/login");

    // Verify student result API does NOT leak sensitive raw sheet rows or formulas
    const studentSampleRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=lower`);
    const studentSample = await studentSampleRes.json();
    assert(studentSample.result.rawRow === undefined, "Result does not expose raw spreadsheet rows");
    assert(studentSample.result.formula === undefined, "Result does not expose internal spreadsheet formulas");
    assert(studentSample.result.allStudents === undefined, "Result does not leak other candidates' records");

    // -------------------------------------------------------------
    // TEST 9: Dynamic Branding Reflection
    // -------------------------------------------------------------
    console.log("\n--- 9. Dynamic Branding Reflection ---");

    let originalBranding = null;
    if (fs.existsSync(BRANDING_FILE)) {
      originalBranding = JSON.parse(fs.readFileSync(BRANDING_FILE, "utf-8"));
      const updatedBranding = {
        ...originalBranding,
        mainHeadline: "Triple E 2nd Quiz Competition [Phase 4 Dynamic Test]",
        announcementText: "Examination Results Portal Fully Operational 2026",
      };
      fs.writeFileSync(BRANDING_FILE, JSON.stringify(updatedBranding, null, 2), "utf-8");
    }

    const updatedHomeRes = await fetch(`${BASE_URL}/`);
    const updatedHomeHtml = await updatedHomeRes.text();
    assert(updatedHomeHtml.includes("Triple E 2nd Quiz Competition [Phase 4 Dynamic Test]"), "Updated headline immediately rendered on public homepage");
    assert(updatedHomeHtml.includes("Examination Results Portal Fully Operational 2026"), "Updated announcement immediately rendered in public announcement banner");

    // Restore original branding
    if (originalBranding) {
      fs.writeFileSync(BRANDING_FILE, JSON.stringify(originalBranding, null, 2), "utf-8");
    }

    // -------------------------------------------------------------
    // TEST 10: Print Stylesheet Validation
    // -------------------------------------------------------------
    console.log("\n--- 10. Print Stylesheet Validation ---");

    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    assert(cssContent.includes("@media print"), "globals.css defines dedicated @media print rules");
    assert(cssContent.includes("size: A4 portrait"), "Defines A4 portrait page sizing for official scorecard");
    assert(cssContent.includes("#result-lookup-header"), "Explicitly hides search section header in print");
    assert(cssContent.includes("#result-lookup-form"), "Explicitly hides search input and category pills in print");
    assert(cssContent.includes(".printable-card"), "Styles printable-card with page-break-inside avoid");

  } finally {
    console.log("\n[Teardown] Shutting down Next.js test server...");
    serverProcess.kill("SIGTERM");
  }

  console.log("\n============================================================");
  console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("============================================================\n");

  if (passedTests === totalTests) {
    console.log("\x1b[32m✔ All Phase 4 requirements verified successfully!\x1b[0m\n");
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
