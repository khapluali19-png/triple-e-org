// Verification Test Suite for Phase 2: Secure Google Sheets Integration
const BASE_URL = "http://localhost:3008";

async function runTests() {
  console.log("=================================================");
  console.log("🧪 STARTING PHASE 2 AUTOMATED TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  // --- Test 1: Category Independence & Distinct Worksheets ---
  console.log("\n--- 1. Testing Category Independence & Worksheets ---");
  try {
    const resLower = await fetch(`${BASE_URL}/api/results?rollNumber=TE-101&category=lower`);
    const dataLower = await resLower.json();
    assert(
      resLower.status === 200 && dataLower.result?.category === "lower" && dataLower.result?.studentName === "Ali Raza",
      "Lower Class Category reads from LowerClass sheet",
      JSON.stringify(dataLower)
    );

    const resMiddle = await fetch(`${BASE_URL}/api/results?rollNumber=TE-102&category=middle`);
    const dataMiddle = await resMiddle.json();
    assert(
      resMiddle.status === 200 && dataMiddle.result?.category === "middle" && dataMiddle.result?.studentName === "Fatima Zahra",
      "Middle Class Category reads from MiddleClass sheet",
      JSON.stringify(dataMiddle)
    );

    const resOverall = await fetch(`${BASE_URL}/api/results?rollNumber=TE-103&category=overall`);
    const dataOverall = await resOverall.json();
    assert(
      resOverall.status === 200 && dataOverall.result?.category === "overall" && dataOverall.result?.studentName === "Kareem Ullah",
      "Overall Category reads from OverallResults sheet",
      JSON.stringify(dataOverall)
    );
  } catch (err) {
    assert(false, "Category Independence fetch", err.message);
  }

  // --- Test 2: Preservation of Leading Zeros ---
  console.log("\n--- 2. Testing Leading Zeros Preservation ---");
  try {
    const resZeroLower = await fetch(`${BASE_URL}/api/results?rollNumber=0042&category=lower`);
    const dataZeroLower = await resZeroLower.json();
    assert(
      resZeroLower.status === 200 && dataZeroLower.result?.rollNumber === "0042",
      "Leading zeros preserved for '0042' in Lower Class",
      JSON.stringify(dataZeroLower)
    );

    const resZeroMiddle = await fetch(`${BASE_URL}/api/results?rollNumber=0088&category=middle`);
    const dataZeroMiddle = await resZeroMiddle.json();
    assert(
      resZeroMiddle.status === 200 && dataZeroMiddle.result?.rollNumber === "0088",
      "Leading zeros preserved for '0088' in Middle Class",
      JSON.stringify(dataZeroMiddle)
    );

    const resZeroOverall = await fetch(`${BASE_URL}/api/results?rollNumber=0007&category=overall`);
    const dataZeroOverall = await resZeroOverall.json();
    assert(
      resZeroOverall.status === 200 && dataZeroOverall.result?.rollNumber === "0007",
      "Leading zeros preserved for '0007' in Overall Track",
      JSON.stringify(dataZeroOverall)
    );
  } catch (err) {
    assert(false, "Leading zero preservation fetch", err.message);
  }

  // --- Test 3: Duplicate Roll Number Collision Handling ---
  console.log("\n--- 3. Testing Duplicate Roll Number Detection ---");
  try {
    const resDup = await fetch(`${BASE_URL}/api/results?rollNumber=TE-DUP-LOWER&category=lower`);
    const dataDup = await resDup.json();
    assert(
      resDup.status === 409 && dataDup.duplicateDetected === true,
      "Duplicate roll numbers produce HTTP 409 Conflict without choosing arbitrarily",
      JSON.stringify(dataDup)
    );
  } catch (err) {
    assert(false, "Duplicate collision test fetch", err.message);
  }

  // --- Test 4: Wrong Spreadsheet ID Handling ---
  console.log("\n--- 4. Testing Invalid Spreadsheet ID Diagnostics ---");
  try {
    const resWrongId = await fetch(`${BASE_URL}/api/admin/sheets/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "triple-e-2026",
      },
      body: JSON.stringify({
        spreadsheetUrl: "INVALID_SPREADSHEET_ID",
      }),
    });
    const dataWrongId = await resWrongId.json();
    assert(
      resWrongId.status === 400 && dataWrongId.success === false && dataWrongId.message.includes("not found"),
      "Invalid Spreadsheet ID produces clear error message",
      JSON.stringify(dataWrongId)
    );
  } catch (err) {
    assert(false, "Wrong spreadsheet ID test fetch", err.message);
  }

  // --- Test 5: Incorrect Permissions Reporting ---
  console.log("\n--- 5. Testing Permission Diagnostics ---");
  try {
    const resForbidden = await fetch(`${BASE_URL}/api/admin/sheets/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "triple-e-2026",
      },
      body: JSON.stringify({
        spreadsheetUrl: "FORBIDDEN_SHEET_ID",
      }),
    });
    const dataForbidden = await resForbidden.json();
    assert(
      resForbidden.status === 400 && (dataForbidden.message.includes("403") || dataForbidden.message.includes("denied") || dataForbidden.errorDetails?.suggestedAction?.includes("service account")),
      "Forbidden spreadsheet returns clear permission guidance with service account instruction",
      JSON.stringify(dataForbidden)
    );
  } catch (err) {
    assert(false, "Forbidden permissions test fetch", err.message);
  }

  // --- Test 6: Security: Public API cannot list all students ---
  console.log("\n--- 6. Testing Public API Exposure Prevention ---");
  try {
    const resNoRoll = await fetch(`${BASE_URL}/api/results`);
    const dataNoRoll = await resNoRoll.json();
    assert(
      resNoRoll.status === 400 && !dataNoRoll.students && !Array.isArray(dataNoRoll),
      "Public API rejects request without roll number and does NOT list students",
      JSON.stringify(dataNoRoll)
    );
  } catch (err) {
    assert(false, "List all students security test", err.message);
  }

  // --- Test 7: Security: Unauthenticated users cannot change sheet connections ---
  console.log("\n--- 7. Testing Admin Authentication Enforcement ---");
  try {
    const resUnauth = await fetch(`${BASE_URL}/api/admin/sheets/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        categoryId: "lower",
        connection: { status: "disconnected" },
      }),
    });
    const dataUnauth = await resUnauth.json();
    assert(
      resUnauth.status === 401 && dataUnauth.success === false,
      "Unauthenticated connection modification rejected with HTTP 401",
      JSON.stringify(dataUnauth)
    );
  } catch (err) {
    assert(false, "Unauthenticated admin test fetch", err.message);
  }

  // --- Test 8: Security: Google credentials never reach the browser ---
  console.log("\n--- 8. Testing Credential Leakage Prevention ---");
  try {
    const resConfig = await fetch(`${BASE_URL}/api/admin/sheets/config`, {
      headers: {
        "x-admin-token": "triple-e-2026",
      },
    });
    const dataConfig = await resConfig.json();
    const configStr = JSON.stringify(dataConfig);
    const hasPrivateKey = configStr.includes("BEGIN PRIVATE KEY") || configStr.includes("private_key");
    const hasApiSecret = configStr.includes("AIzaSy");
    assert(
      !hasPrivateKey && !hasApiSecret,
      "API responses never leak Google Private Keys or API secrets",
      "Leaked secret found in config!"
    );
  } catch (err) {
    assert(false, "Credential leak prevention test", err.message);
  }

  console.log("\n=================================================");
  console.log(`📊 FINAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
