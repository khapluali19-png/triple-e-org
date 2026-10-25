/**
 * Triple E Organization 2nd Quiz Competition
 * Automated Verification Suite for Special School Examination Center Search
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 3020;
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

async function runSpecialSchoolTests() {
  console.log("\n============================================================");
  console.log("   TRIPLE E - SPECIAL SCHOOL EXAMINATION CENTER QA          ");
  console.log("============================================================\n");

  const useProd = fs.existsSync(path.join(process.cwd(), ".next", "BUILD_ID"));
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

    // -------------------------------------------------------------
    // Test 1: Real Special School Student "Amira" (Center: special-school, Level: Level 1)
    // -------------------------------------------------------------
    console.log("--- Test 1: Real Special School Student (Amira) ---");
    const res1 = await fetch(`${BASE_URL}/api/results?studentName=Amira&center=special-school&level=Level%201`);
    const data1 = await res1.json();
    assert(res1.status === 200, "Amira in special-school returns HTTP 200 OK");
    assert(data1.success === true, "Lookup success flag is true");
    assert(data1.result.studentName.toLowerCase() === "amira", "Student name matches Amira");
    assert(data1.result.fatherName.toLowerCase() === "barkat", "Father name matches Barkat");
    assert(data1.result.classOrSection === "8th", "Class matches 8th");
    assert(data1.result.examinationCenter === "Special School", "Center name is Special School");
    assert(data1.result.obtainedMarks === 32, "Obtained marks matches 32");
    assert(data1.result.totalMarks === 50, "Total marks matches 50");
    assert(data1.result.percentage === 64, "Percentage is 64%");
    assert(data1.result.grade === "C", "Grade is C");

    // -------------------------------------------------------------
    // Test 2: Real Special School Student "M. Reehan" (punctuation & capitalization)
    // -------------------------------------------------------------
    console.log("\n--- Test 2: Student with Punctuation (M. Reehan) ---");
    const res2 = await fetch(`${BASE_URL}/api/results?studentName=M.%20Reehan&center=special-school&level=Level%201`);
    const data2 = await res2.json();
    assert(res2.status === 200, "M. Reehan in special-school returns HTTP 200 OK");
    assert(data2.result.studentName.includes("Reehan"), "Student name contains Reehan");
    assert(data2.result.obtainedMarks === 30, "Obtained marks matches 30");

    // Also test search without dot: "M Reehan"
    const res2b = await fetch(`${BASE_URL}/api/results?studentName=M%20Reehan&center=special-school&level=Level%201`);
    const data2b = await res2b.json();
    assert(res2b.status === 200, "Search without dot 'M Reehan' resolves HTTP 200 OK");
    assert(data2b.result.obtainedMarks === 30, "Marks match 30");

    // -------------------------------------------------------------
    // Test 3: Center Name Harmless Variations
    // -------------------------------------------------------------
    console.log("\n--- Test 3: Center Name Harmless Variations ---");
    // Variation A: "Special School" (with space, from dropdown display)
    const res3a = await fetch(`${BASE_URL}/api/results?studentName=Farzana&center=Special%20School&level=Level%201`);
    const data3a = await res3a.json();
    assert(res3a.status === 200, "Center 'Special School' (with space) returns HTTP 200 OK");
    assert(data3a.result.studentName.toLowerCase() === "farzana", "Matched Farzana");
    assert(data3a.result.obtainedMarks === 28, "Marks match 28");

    // Variation B: "SpecialSchool" (camelCase / no space)
    const res3b = await fetch(`${BASE_URL}/api/results?studentName=Farzana&center=SpecialSchool&level=Level%201`);
    assert(res3b.status === 200, "Center 'SpecialSchool' (no space) returns HTTP 200 OK");

    // Variation C: "special" (short name)
    const res3c = await fetch(`${BASE_URL}/api/results?studentName=Farzana&center=special&level=Level%201`);
    assert(res3c.status === 200, "Center 'special' (short name) returns HTTP 200 OK");

    // Variation D: "Special School Center" (appended center word)
    const res3d = await fetch(`${BASE_URL}/api/results?studentName=Farzana&center=Special%20School%20Center&level=Level%201`);
    assert(res3d.status === 200, "Center 'Special School Center' returns HTTP 200 OK");

    // -------------------------------------------------------------
    // Test 4: Optional Filters (Father Name, School Name, Class)
    // -------------------------------------------------------------
    console.log("\n--- Test 4: Optional Filters with Special School ---");
    // Search with valid optional filters
    const res4 = await fetch(`${BASE_URL}/api/results?studentName=Amira&center=special-school&level=Level%201&fatherName=Barkat&school=Special%20School&class=8th`);
    const data4 = await res4.json();
    assert(res4.status === 200, "Search with valid optional filters returns HTTP 200 OK");
    assert(data4.result.studentName.toLowerCase() === "amira", "Matches Amira");

    // Search with mismatched father name returns VERIFICATION_FAILED (HTTP 404)
    const res4mismatch = await fetch(`${BASE_URL}/api/results?studentName=Amira&center=special-school&level=Level%201&fatherName=WrongFather`);
    const data4mismatch = await res4mismatch.json();
    assert(res4mismatch.status === 404, "Mismatched optional father name returns HTTP 404");
    assert(data4mismatch.code === "VERIFICATION_FAILED", "Error code is VERIFICATION_FAILED");

    // -------------------------------------------------------------
    // Test 5: Confirm Other Centers Continue Working
    // -------------------------------------------------------------
    console.log("\n--- Test 5: Other Examination Centers Verification ---");
    // Dumsum (Sairaa)
    const resDumsum = await fetch(`${BASE_URL}/api/results?studentName=Sairaa&center=dumsum&level=Level%201`);
    const dataDumsum = await resDumsum.json();
    assert(resDumsum.status === 200, "Dumsum center (Sairaa) returns HTTP 200 OK");
    assert(dataDumsum.result.studentName.toLowerCase().includes("sairaa"), "Matches Sairaa");

    // Ghursay (Own Ali)
    const resGhursay = await fetch(`${BASE_URL}/api/results?studentName=Own%20Ali&center=ghursay&level=Level%201`);
    const dataGhursay = await resGhursay.json();
    assert(resGhursay.status === 200, "Ghursay center (Own Ali) returns HTTP 200 OK");
    assert(dataGhursay.result.examinationCenter === "Ghursay", "Center is Ghursay");

    // Khaplu (Ali Musa)
    const resKhaplu = await fetch(`${BASE_URL}/api/results?studentName=Ali%20Musa&center=khaplu&level=Level%201`);
    assert(resKhaplu.status === 200, "Khaplu center (Ali Musa) returns HTTP 200 OK");

    // -------------------------------------------------------------
    // Test 6: Non-existent Record in Special School returns 404
    // -------------------------------------------------------------
    console.log("\n--- Test 6: Non-existent Record returns NOT_FOUND ---");
    const resNotFound = await fetch(`${BASE_URL}/api/results?studentName=NonExistentSpecialStudent&center=special-school&level=Level%201`);
    const dataNotFound = await resNotFound.json();
    assert(resNotFound.status === 404, "Non-existent student returns HTTP 404");
    assert(dataNotFound.code === "NOT_FOUND", "Error code is NOT_FOUND");

    console.log("\n============================================================");
    console.log("   ALL SPECIAL SCHOOL VERIFICATION TESTS PASSED (100%)      ");
    console.log("============================================================\n");
  } finally {
    serverProcess.kill("SIGTERM");
  }
}

runSpecialSchoolTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
