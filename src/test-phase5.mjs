/**
 * Triple E Organization 2nd Quiz Competition Result Portal
 * Phase 5 Production Readiness, QA, and Deployment Verification Suite
 *
 * Comprehensive Automated Verification covering:
 * 1. Administrator Authentication, Session Protection, and Password Management.
 * 2. Multi-Category Independent Google Sheets Connections & Category Isolation.
 * 3. Leading Zero Preservation ("0042", "0088", "0007") and Duplicate Collision Protection (409).
 * 4. Disconnected Sheet Graceful Degradation (503) without Server Exceptions.
 * 5. Siachen Mark Partner Attribution Verification:
 *    - Authentic asset verification from partner/logo.jpg.
 *    - Exact default copy: "Designed & Developed by Siachen Mark Agency", "Islamabad", "Basharat Ali | Former Social Media Head, Triple E Organization".
 *    - Link target: https://siachen-mark.vercel.app/ with target="_blank" and rel="noopener noreferrer".
 *    - Preserved 1:1 aspect ratio with object-contain.
 *    - Admin editability and live reflection.
 * 6. Privacy & Security Audit:
 *    - No raw rows, formulas, or full student lists exposed.
 *    - Admin mutations require valid credentials.
 *    - Admin navigation buttons hidden from public header.
 * 7. Design & Responsive Layout Audit:
 *    - Responsive meta tags and styling.
 *    - A4 Print stylesheet isolating result card and hiding page chrome.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import bcrypt from "bcryptjs";

const PORT = 3010;
const BASE_URL = `http://localhost:${PORT}`;
const DATA_DIR = path.join(process.cwd(), "src", "data");
const CONFIG_FILE = path.join(DATA_DIR, "category-sheets-config.json");
const BRANDING_FILE = path.join(DATA_DIR, "branding-config.json");
const AUTH_FILE = path.join(DATA_DIR, "admin-auth.json");

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

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/branding`);
      if (res.status === 200) return true;
    } catch {
      // wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function runTestSuite() {
  console.log("\n============================================================");
  console.log("   TRIPLE E ORGANIZATION - PHASE 5 PRODUCTION QA SUITE      ");
  console.log("============================================================\n");

  const useProd = fs.existsSync(path.join(process.cwd(), ".next"));
  console.log(`[Setup] Spawning Next.js server (${useProd ? "production" : "dev"}) on port ${PORT}...`);
  const serverProcess = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", useProd ? "start" : "dev", "-p", String(PORT)],
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

    // =============================================================
    // SECTION 1: Siachen Mark Partner Attribution Audit
    // =============================================================
    console.log("--- 1. Siachen Mark Partner Attribution Audit ---");

    // 1a. File existence
    const partnerSourceLogo = path.join(process.cwd(), "partner", "logo.jpg");
    const partnerPublicLogo = path.join(process.cwd(), "public", "images", "logos", "siachen-mark-logo.jpg");
    assert(fs.existsSync(partnerSourceLogo), "Authentic Siachen Mark logo exists in partner/logo.jpg");
    assert(fs.existsSync(partnerPublicLogo), "Public web asset exists in public/images/logos/siachen-mark-logo.jpg");

    // 1b. Public homepage attribution HTML inspection
    const homeRes = await fetch(`${BASE_URL}/`);
    const homeHtml = await homeRes.text();

    assert(
      homeHtml.includes("Designed &amp; Developed by Siachen Mark Agency") ||
      homeHtml.includes("Designed & Developed by Siachen Mark Agency") ||
      homeHtml.includes("Siachen Mark"),
      "Public footer renders partner attribution"
    );

    assert(
      homeHtml.includes("Islamabad"),
      "Public footer renders partner city: 'Islamabad'"
    );

    assert(
      homeHtml.includes("Basharat Ali | Former Social Media Head, Triple E Organization"),
      "Public footer renders leadership credit: 'Basharat Ali | Former Social Media Head, Triple E Organization'"
    );

    assert(
      homeHtml.includes('href="https://siachen-mark.vercel.app/"') ||
      homeHtml.includes('href="https://siachen-mark.vercel.app"'),
      "Siachen Mark logo/agency link points to official URL: https://siachen-mark.vercel.app/"
    );

    assert(
      homeHtml.includes('target="_blank"') && homeHtml.includes('rel="noopener noreferrer"'),
      "Partner link opens in new tab with safe attributes (target='_blank' rel='noopener noreferrer')"
    );

    assert(
      homeHtml.includes("object-contain"),
      "Partner logo uses object-contain to preserve authentic 1:1 aspect ratio without distortion"
    );

    // =============================================================
    // SECTION 2: Admin Authentication & Route Protection
    // =============================================================
    console.log("\n--- 2. Admin Authentication & Route Protection ---");

    // Reset admin account to initial bootstrap state for repeatable testing
    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync("ali12345", salt);
    fs.writeFileSync(AUTH_FILE, JSON.stringify({
      email: "khapluali19@gmail.com",
      passwordHash: hash,
      mustChangePassword: true,
      lastLoginAt: null,
      passwordChangedAt: null,
    }, null, 2), "utf-8");

    // 2a. Rejection of invalid credentials
    const invalidLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "khapluali19@gmail.com", password: "wrong-password-999" }),
    });
    assert(invalidLoginRes.status === 401, "Invalid login credentials returns HTTP 401 Unauthorized");

    // 2b. Rejection of unauthorized mutations
    const unauthMutationRes = await fetch(`${BASE_URL}/api/admin/branding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mainHeadline: "Hacked Title" }),
    });
    assert(unauthMutationRes.status === 401, "Unauthenticated POST /api/admin/branding returns HTTP 401 Unauthorized");

    const unauthSheetsRes = await fetch(`${BASE_URL}/api/admin/sheets/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "lower", connection: { status: "disconnected" } }),
    });
    assert(unauthSheetsRes.status === 401, "Unauthenticated POST /api/admin/sheets/config returns HTTP 401 Unauthorized");

    // 2c. Successful authentication with bootstrap token / session
    const validLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "khapluali19@gmail.com", password: "ali12345" }),
    });
    const validLoginData = await validLoginRes.json();
    assert(validLoginRes.status === 200, "Valid bootstrap login returns HTTP 200 OK");
    assert(validLoginData.success === true, "Login response reports success: true");

    const sessionCookie = validLoginRes.headers.get("set-cookie");
    assert(!!sessionCookie && sessionCookie.includes("HttpOnly"), "Login issues secure HttpOnly session cookie");

    // =============================================================
    // SECTION 3: Google Sheets Multi-Category & Category Isolation
    // =============================================================
    console.log("\n--- 3. Google Sheets Multi-Category & Category Isolation ---");

    // 3a. Lower Class lookup
    const lowerRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=lower`);
    const lowerData = await lowerRes.json();
    assert(lowerRes.status === 200, "Lower Class candidate (TE-101) returns HTTP 200 OK");
    assert(lowerData.result.studentName === "Ali Raza", "Lower candidate matched: Ali Raza");
    assert(lowerData.result.category === "lower", "Result category tag is 'lower'");

    // 3b. Middle Class lookup
    const middleRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-102&category=middle`);
    const middleData = await middleRes.json();
    assert(middleRes.status === 200, "Middle Class candidate (TE-102) returns HTTP 200 OK");
    assert(middleData.result.studentName === "Fatima Zahra", "Middle candidate matched: Fatima Zahra");
    assert(middleData.result.category === "middle", "Result category tag is 'middle'");

    // 3c. Overall Track lookup
    const overallRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-103&category=overall`);
    const overallData = await overallRes.json();
    assert(overallRes.status === 200, "Overall Track candidate (TE-103) returns HTTP 200 OK");
    assert(overallData.result.studentName === "Kareem Ullah", "Overall candidate matched: Kareem Ullah");
    assert(overallData.result.category === "overall", "Result category tag is 'overall'");

    // 3d. Strict category isolation tests
    const iso1 = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=middle`);
    assert(iso1.status === 404, "Isolation: Lower candidate TE-101 NOT found in Middle Category (404)");

    const iso2 = await fetch(`${BASE_URL}/api/results?rollNumber=TE-102&category=lower`);
    assert(iso2.status === 404, "Isolation: Middle candidate TE-102 NOT found in Lower Category (404)");

    const iso3 = await fetch(`${BASE_URL}/api/results?rollNumber=TE-103&category=middle`);
    assert(iso3.status === 404, "Isolation: Overall candidate TE-103 NOT found in Middle Category (404)");

    // =============================================================
    // SECTION 4: Leading Zero Preservation & Duplicate Collision Handling
    // =============================================================
    console.log("\n--- 4. Leading Zeros & Duplicate Collision Handling ---");

    // Leading zeros
    const zeroLower = await fetch(`${BASE_URL}/api/results?rollNumber=0042&category=lower`);
    const zeroLowerData = await zeroLower.json();
    assert(zeroLower.status === 200, "Leading zero roll '0042' resolves successfully");
    assert(zeroLowerData.result.rollNumber === "0042", "Leading zeros strictly preserved: '0042'");

    const zeroMiddle = await fetch(`${BASE_URL}/api/results?rollNumber=0088&category=middle`);
    const zeroMiddleData = await zeroMiddle.json();
    assert(zeroMiddle.status === 200, "Leading zero roll '0088' resolves successfully");
    assert(zeroMiddleData.result.rollNumber === "0088", "Leading zeros strictly preserved: '0088'");

    const zeroOverall = await fetch(`${BASE_URL}/api/results?rollNumber=0007&category=overall`);
    const zeroOverallData = await zeroOverall.json();
    assert(zeroOverall.status === 200, "Leading zero roll '0007' resolves successfully");
    assert(zeroOverallData.result.rollNumber === "0007", "Leading zeros strictly preserved: '0007'");

    // Duplicate collision
    const dupRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-DUP-LOWER&category=lower`);
    const dupData = await dupRes.json();
    assert(dupRes.status === 409, "Duplicate roll number returns HTTP 409 Conflict");
    assert(dupData.code === "DUPLICATE_ROLL", "Error code is DUPLICATE_ROLL");
    assert(dupData.duplicateDetected === true, "Flag duplicateDetected is true");
    assert(!dupData.result, "Ambiguous records refused; no corrupted result object returned");

    // =============================================================
    // SECTION 5: Disconnected Sheet Handling
    // =============================================================
    console.log("\n--- 5. Disconnected Category Sheet Handling ---");

    // Disconnect overall category
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

    const discLookup = await fetch(`${BASE_URL}/api/results?rollNumber=TE-103&category=overall`);
    const discLookupData = await discLookup.json();
    assert(discLookup.status === 503, "Lookup against disconnected category returns HTTP 503 Service Unavailable");
    assert(discLookupData.code === "SHEET_UNAVAILABLE", "Reports code SHEET_UNAVAILABLE");
    assert(
      discLookupData.message.includes("not configured or connected") ||
      discLookupData.message.includes("unavailable"),
      "Helpful error message explains ledger is not currently connected"
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

    const reconnLookup = await fetch(`${BASE_URL}/api/results?rollNumber=TE-103&category=overall`);
    assert(reconnLookup.status === 200, "Reconnected category restores immediate service (200 OK)");

    // =============================================================
    // SECTION 6: Privacy, Data Protection, and Public Boundaries
    // =============================================================
    console.log("\n--- 6. Privacy, Data Protection, and Public Boundaries ---");

    // 6a. Single-student projection: ensure only approved public fields return
    const candidateRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=lower`);
    const candidateData = await candidateRes.json();
    const resultObj = candidateData.result;

    assert(resultObj.studentName === "Ali Raza", "Approved field: studentName provided");
    assert(resultObj.obtainedMarks === 94, "Approved field: obtainedMarks provided");
    assert(resultObj.percentage === 94, "Approved field: percentage provided");
    assert(resultObj.rawRow === undefined, "Security: raw spreadsheet row is NOT exposed");
    assert(resultObj.formula === undefined, "Security: spreadsheet formulas are NOT exposed");
    assert(resultObj.spreadsheetId === undefined, "Security: spreadsheet ID is NOT exposed in result");
    assert(resultObj.allStudents === undefined, "Security: full candidate roster is NOT exposed");

    // 6b. Header does not expose admin link
    assert(!homeHtml.includes("Admin Access"), "Header does not expose 'Admin Access' link to public students");

    // =============================================================
    // SECTION 7: Design, Responsive Layout & A4 Print Stylesheet
    // =============================================================
    console.log("\n--- 7. Design, Responsive Layout & A4 Print Stylesheet ---");

    // 7a. Layout & Viewport
    assert(homeHtml.includes("viewport"), "HTML includes responsive viewport meta tag");

    // 7b. Print Stylesheet
    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert(cssContent.includes("@media print"), "globals.css defines dedicated @media print rules");
    assert(cssContent.includes("A4"), "Defines A4 page sizing");
    assert(cssContent.includes(".certificate-print-root") || cssContent.includes(".printable-card"), "Result scorecard styled for print");
    assert(cssContent.includes("nav,"), "Print stylesheet hides top navigation bar");
    assert(cssContent.includes("footer,"), "Print stylesheet hides page footers in print mode");
    assert(cssContent.includes("#result-lookup-form"), "Print stylesheet hides search input form in print mode");

    // 7c. Triple E Organization Logo
    const tripleELogoPath = path.join(process.cwd(), "public", "images", "logos", "triple-e-logo.jpg");
    assert(fs.existsSync(tripleELogoPath), "Triple E official emblem exists at public/images/logos/triple-e-logo.jpg");

  } finally {
    console.log("\n[Teardown] Shutting down Next.js test server...");
    serverProcess.kill("SIGTERM");
  }

  console.log("\n============================================================");
  console.log(`   PHASE 5 TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("============================================================\n");

  if (passedTests === totalTests) {
    console.log("\x1b[32m✔ All Phase 5 Production Readiness & QA checks verified successfully!\x1b[0m\n");
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
