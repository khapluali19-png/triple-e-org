/**
 * Triple E Organization 2nd Quiz Competition
 * Comprehensive Verification Suite for Google Sheets Result Lookup & Dynamic Grading
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 3012;
const BASE_URL = `http://localhost:${PORT}`;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✖ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✔ [PASS] ${message}`);
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

async function runLookupVerificationSuite() {
  console.log("\n============================================================");
  console.log("   TRIPLE E - GOOGLE SHEETS LOOKUP & DYNAMIC GRADING QA     ");
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
    console.log(`[Setup] Next.js test server is online at ${BASE_URL}\n`);

    // =============================================================
    // SECTION 1: Searching for Candidate 222 (Ali)
    // =============================================================
    console.log("--- 1. Verification of Roll Number 222 (Ali) ---");

    const res222 = await fetch(`${BASE_URL}/api/results?rollNumber=222&category=middle`);
    const data222 = await res222.json();
    assert(res222.status === 200, "Roll 222 returns HTTP 200 OK");
    assert(data222.success === true, "Lookup success flag is true for roll 222");
    assert(data222.result.studentName === "Ali", "Student name matches: Ali");
    assert(data222.result.rollNumber === "222", "Roll number matches: 222");
    assert(data222.result.fatherName === "ab", "Father name matches: ab");
    assert(data222.result.obtainedMarks === 59, "Obtained marks: 59");
    assert(data222.result.totalMarks === 100, "Total marks: 100");
    assert(data222.result.percentage === 59, "Percentage: 59%");
    assert(
      data222.result.grade === "C",
      "DYNAMIC GRADE IS 'C': (59/100 = 59% -> Grade C, sheet 'Status' value 'A' safely ignored)"
    );

    // =============================================================
    // SECTION 2: Searching for Candidate 123 (khan)
    // =============================================================
    console.log("\n--- 2. Verification of Roll Number 123 (khan) ---");

    const res123 = await fetch(`${BASE_URL}/api/results?rollNumber=123&category=middle`);
    const data123 = await res123.json();
    assert(res123.status === 200, "Roll 123 returns HTTP 200 OK");
    assert(data123.success === true, "Lookup success flag is true for roll 123");
    assert(data123.result.studentName === "khan", "Student name matches: khan");
    assert(data123.result.rollNumber === "123", "Roll number matches: 123");
    assert(data123.result.fatherName === "bc", "Father name matches: bc");
    assert(data123.result.obtainedMarks === 80, "Obtained marks: 80");
    assert(data123.result.totalMarks === 100, "Total marks: 100");
    assert(data123.result.percentage === 80, "Percentage: 80%");
    assert(
      data123.result.grade === "A",
      "DYNAMIC GRADE IS 'A': (80/100 = 80% -> Grade A, sheet 'Status' value 'A+' safely ignored)"
    );

    // =============================================================
    // SECTION 3: Dynamic Grade Boundary Cases
    // =============================================================
    console.log("\n--- 3. Dynamic Grade Boundary Cases ---");

    const boundaryTests = [
      { roll: "BND-49", expectedGrade: "D", expectedPct: 49, desc: "< 50% boundary (49% -> Grade D)" },
      { roll: "BND-50", expectedGrade: "C", expectedPct: 50, desc: ">= 50% boundary (50% -> Grade C)" },
      { roll: "BND-64", expectedGrade: "C", expectedPct: 64, desc: "< 65% boundary (64% -> Grade C)" },
      { roll: "BND-65", expectedGrade: "B", expectedPct: 65, desc: ">= 65% boundary (65% -> Grade B)" },
      { roll: "BND-74", expectedGrade: "B", expectedPct: 74, desc: "< 75% boundary (74% -> Grade B)" },
      { roll: "BND-75", expectedGrade: "A", expectedPct: 75, desc: ">= 75% boundary (75% -> Grade A)" },
      { roll: "BND-89", expectedGrade: "A", expectedPct: 89, desc: "< 90% boundary (89% -> Grade A)" },
      { roll: "BND-90", expectedGrade: "A+", expectedPct: 90, desc: ">= 90% boundary (90% -> Grade A+)" },
    ];

    for (const b of boundaryTests) {
      const bRes = await fetch(`${BASE_URL}/api/results?rollNumber=${b.roll}&category=middle`);
      const bData = await bRes.json();
      assert(bRes.status === 200, `Boundary ${b.roll} returns HTTP 200 OK`);
      assert(bData.result.percentage === b.expectedPct, `Boundary ${b.roll} percentage is ${b.expectedPct}%`);
      assert(bData.result.grade === b.expectedGrade, `Boundary ${b.desc}`);
    }

    // =============================================================
    // SECTION 4: Leading Zeros & Robust String Matching
    // =============================================================
    console.log("\n--- 4. Leading Zeros & Whitespace Normalization ---");

    const zeroRes = await fetch(`${BASE_URL}/api/results?rollNumber=0042&category=lower`);
    const zeroData = await zeroRes.json();
    assert(zeroRes.status === 200, "Leading zero candidate '0042' returns HTTP 200 OK");
    assert(zeroData.result.rollNumber === "0042", "Leading zeroes strictly preserved as text: '0042'");

    const spaceRes = await fetch(`${BASE_URL}/api/results?rollNumber=%20222%20&category=middle`);
    const spaceData = await spaceRes.json();
    assert(spaceRes.status === 200, "Candidate lookup with leading/trailing spaces ' 222 ' returns HTTP 200 OK");
    assert(spaceData.result.studentName === "Ali", "Whitespace normalized: matched Ali");

    // =============================================================
    // SECTION 5: Collision Detection & Non-Existent Roll Numbers
    // =============================================================
    console.log("\n--- 5. Duplicate Collision & Not Found Handling ---");

    const dupRes = await fetch(`${BASE_URL}/api/results?rollNumber=TE-DUP-LOWER&category=lower`);
    assert(dupRes.status === 409, "Duplicate roll number returns HTTP 409 Conflict");
    const dupData = await dupRes.json();
    assert(dupData.code === "DUPLICATE_ROLL", "Error code is DUPLICATE_ROLL");
    assert(dupData.duplicateDetected === true, "Flag duplicateDetected is true");

    const notFoundRes = await fetch(`${BASE_URL}/api/results?rollNumber=99999999&category=middle`);
    if (notFoundRes.status !== 404) {
      console.log("Unexpected status:", notFoundRes.status, await notFoundRes.text());
    }
    assert(notFoundRes.status === 404, "Non-existent candidate returns HTTP 404 Not Found");

    // =============================================================
    // SECTION 6: Admin Diagnostic Test Lookup Tool
    // =============================================================
    console.log("\n--- 6. Admin Diagnostic Test Lookup Tool ---");

    // 6a. Unauthenticated access rejected
    const unauthTestRes = await fetch(`${BASE_URL}/api/admin/sheets/test-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "middle", rollNumber: "222" }),
    });
    assert(unauthTestRes.status === 401, "Unauthenticated admin test lookup returns HTTP 401 Unauthorized");

    // 6b. Authenticated admin test lookup for roll 222
    const adminTestRes = await fetch(`${BASE_URL}/api/admin/sheets/test-lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "triple-e-2026",
      },
      body: JSON.stringify({
        categoryId: "middle",
        rollNumber: "222",
        worksheetName: "MiddleClass",
      }),
    });
    const adminTestData = await adminTestRes.json();
    assert(adminTestRes.status === 200, "Authenticated admin test lookup for 222 returns HTTP 200 OK");
    assert(adminTestData.success === true, "Admin test lookup reports success: true");
    assert(adminTestData.result.studentName === "Ali", "Admin test lookup matches studentName: Ali");
    assert(adminTestData.result.fatherName === "ab", "Admin test lookup matches fatherName: ab");
    assert(adminTestData.result.grade === "C", "Admin test lookup calculated grade: C");
    assert(!!adminTestData.detectedColumns, "Admin test lookup reports detectedColumns mapping");
    assert(!!adminTestData.diagnosticNote, "Admin test lookup includes dynamic grade diagnostic note");

    // 6c. Authenticated admin test lookup for roll 123
    const adminTest123 = await fetch(`${BASE_URL}/api/admin/sheets/test-lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "triple-e-2026",
      },
      body: JSON.stringify({
        categoryId: "middle",
        rollNumber: "123",
        worksheetName: "MiddleClass",
      }),
    });
    const adminData123 = await adminTest123.json();
    assert(adminTest123.status === 200, "Admin test lookup for 123 returns HTTP 200 OK");
    assert(adminData123.result.studentName === "khan", "Admin test lookup matches studentName: khan");
    assert(adminData123.result.fatherName === "bc", "Admin test lookup matches fatherName: bc");
    assert(adminData123.result.grade === "A", "Admin test lookup calculated grade: A");

    // 6d. Admin test lookup for non-existent candidate returns 404
    const adminTest404 = await fetch(`${BASE_URL}/api/admin/sheets/test-lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "triple-e-2026",
      },
      body: JSON.stringify({
        categoryId: "middle",
        rollNumber: "NON-EXISTENT-XYZ",
        worksheetName: "MiddleClass",
      }),
    });
    assert(adminTest404.status === 404, "Admin test lookup for non-existent roll returns HTTP 404 Not Found");

    // =============================================================
    // SECTION 7: Strict Category Isolation Preserved
    // =============================================================
    console.log("\n--- 7. Category Isolation Verification ---");

    const isoLower = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=middle`);
    assert(isoLower.status === 404, "Category Isolation: Lower candidate TE-101 is NOT found in Middle category (404)");

    const isoMiddle = await fetch(`${BASE_URL}/api/results?rollNumber=TE-102&category=lower`);
    assert(isoMiddle.status === 404, "Category Isolation: Middle candidate TE-102 is NOT found in Lower category (404)");

    const isoOverall = await fetch(`${BASE_URL}/api/results?rollNumber=TE-103&category=middle`);
    assert(isoOverall.status === 404, "Category Isolation: Overall candidate TE-103 is NOT found in Middle category (404)");

    console.log("\n============================================================");
    console.log("   ALL LOOKUP & DYNAMIC GRADING TESTS PASSED (100%)         ");
    console.log("============================================================\n");
  } catch (err) {
    console.error("\nTest suite failed with error:", err);
    process.exitCode = 1;
  } finally {
    console.log("[Teardown] Shutting down Next.js test server...");
    serverProcess.kill("SIGTERM");
  }
}

runLookupVerificationSuite();
