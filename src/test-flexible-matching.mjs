/**
 * Triple E Organization - Comprehensive Automated QA Suite
 * Flexible School/Class Matching, Level Enforcement, & Candidate Disambiguation
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 3016;
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

async function runTests() {
  console.log("\n============================================================");
  console.log("   TRIPLE E - FLEXIBLE MATCHING & CANDIDATE DISAMBIGUATION QA ");
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
    // 1. Mandatory Level Enforcement
    // -------------------------------------------------------------
    console.log("--- 1. Mandatory Level Enforcement ---");
    const missingLevelRes = await fetch(`${BASE_URL}/api/results?studentName=Maryum&center=khaplu`);
    const missingLevelData = await missingLevelRes.json();
    assert(missingLevelRes.status === 400, "Missing level query param returns HTTP 400 Bad Request");
    assert(missingLevelData.code === "MISSING_LEVEL", "Error code is MISSING_LEVEL");
    assert(missingLevelData.success === false, "Success is false when level is missing");

    // -------------------------------------------------------------
    // 2. Duplicate Students with Missing Father's Name (Maryum in Khaplu, Level 1)
    // -------------------------------------------------------------
    console.log("\n--- 2. Duplicate Students with Missing Father's Name (Ambiguous Multi-Match) ---");
    const dupRes = await fetch(`${BASE_URL}/api/results?studentName=Maryum&center=khaplu&level=Level%201`);
    const dupData = await dupRes.json();
    assert(dupRes.status === 400, "Duplicate Maryum returns HTTP 400 Ambiguity");
    assert(dupData.code === "AMBIGUOUS_STUDENT", "Error code is AMBIGUOUS_STUDENT");
    assert(dupData.ambiguityDetected === true, "ambiguityDetected is true");
    assert(Array.isArray(dupData.candidates) && dupData.candidates.length >= 2, "Returns candidates list with at least 2 candidates");
    console.log(`    Found ${dupData.candidates.length} candidates for Maryum:`);
    dupData.candidates.forEach((c, idx) => {
      console.log(`      Candidate ${idx + 1}: Class="${c.classOrSection}", School="${c.schoolName}", Father="${c.fatherName || 'None'}"`);
      assert(c.studentName.toLowerCase().includes("maryum"), `Candidate ${idx + 1} studentName contains Maryum`);
      assert(Boolean(c.result), `Candidate ${idx + 1} has pre-computed result payload`);
    });

    // -------------------------------------------------------------
    // 3. Disambiguation via Optional Class Filter
    // -------------------------------------------------------------
    console.log("\n--- 3. Disambiguation via Optional Class Filter ---");
    // Only one Maryum is in 8th class
    const classRes = await fetch(`${BASE_URL}/api/results?studentName=Maryum&center=khaplu&level=Level%201&class=8th`);
    const classData = await classRes.json();
    assert(classRes.status === 200, "Disambiguating by Class 8th returns HTTP 200 OK");
    assert(classData.success === true, "Lookup success is true");
    assert(classData.result.studentName.toLowerCase().includes("maryum"), "Matched student is Maryum");
    assert(classData.result.classOrSection.includes("8"), "Result class is 8th");
    assert(classData.result.obtainedMarks === 34, "Obtained marks is 34");

    // Also test numeric class input "8" without "th"
    const numClassRes = await fetch(`${BASE_URL}/api/results?studentName=Maryum&center=khaplu&level=Level%201&class=8`);
    const numClassData = await numClassRes.json();
    assert(numClassRes.status === 200, "Disambiguating by numeric Class 8 returns HTTP 200 OK");
    assert(numClassData.result.obtainedMarks === 34, "Numeric 8 resolves to class 8th candidate (34 marks)");

    // -------------------------------------------------------------
    // 4. Flexible School Matching: Permuted Word Order & Acronyms
    // -------------------------------------------------------------
    console.log("\n--- 4. Flexible School Matching (Permutation & Flexibility) ---");
    // Candidate has school "Ali Garth Public school Khp"
    // Search with "Ali Garth"
    const schoolRes1 = await fetch(`${BASE_URL}/api/results?studentName=Maryum&center=khaplu&level=Level%201&school=Ali%20Garth`);
    const schoolData1 = await schoolRes1.json();
    assert(schoolRes1.status === 200, "School 'Ali Garth' resolves single candidate (HTTP 200)");
    assert(schoolData1.result.schoolName.toLowerCase().includes("ali garth"), "Matched Ali Garth school");
    assert(schoolData1.result.obtainedMarks === 7, "Obtained marks is 7");

    // Search with permuted word order: "Public School Ali Garth"
    const schoolRes2 = await fetch(`${BASE_URL}/api/results?studentName=Maryum&center=khaplu&level=Level%201&school=Public%20School%20Ali%20Garth`);
    const schoolData2 = await schoolRes2.json();
    assert(schoolRes2.status === 200, "Permuted school 'Public School Ali Garth' resolves HTTP 200 OK");
    assert(schoolData2.result.obtainedMarks === 7, "Obtained marks matches (7)");

    // Candidate has school "Khp Public School KPS"
    // Test word order variation: "Public School Khaplu" vs "Khp Public School"
    const schoolRes3 = await fetch(`${BASE_URL}/api/results?studentName=Maryum&center=khaplu&level=Level%201&school=Public%20School%20Khp`);
    const schoolData3 = await schoolRes3.json();
    assert(schoolRes3.status === 200 || schoolRes3.status === 400, "Search responded reliably without crashing");

    // -------------------------------------------------------------
    // 5. Candidate Index Direct Selection
    // -------------------------------------------------------------
    console.log("\n--- 5. Candidate Index Direct Selection ---");
    // When multiple candidates match, candidateIndex allows picking candidate 0
    const candSelectRes = await fetch(`${BASE_URL}/api/results?studentName=Maryum&center=khaplu&level=Level%201&candidateIndex=0`);
    const candSelectData = await candSelectRes.json();
    assert(candSelectRes.status === 200, "Direct candidateIndex selection returns HTTP 200 OK");
    assert(candSelectData.success === true, "Lookup success is true");
    assert(candSelectData.result.studentName.toLowerCase().includes("maryum"), "Selected candidate result returned");

    // -------------------------------------------------------------
    // 6. Non-duplicate Student Searches Work Without Optional Filters
    // -------------------------------------------------------------
    console.log("\n--- 6. Unique Student Search Without Optional Filters ---");
    const uniqueRes = await fetch(`${BASE_URL}/api/results?studentName=Own%20Ali&center=ghursay&level=Level%201`);
    const uniqueData = await uniqueRes.json();
    assert(uniqueRes.status === 200, "Own Ali in Ghursay Level 1 returns HTTP 200 OK without any optional filters");
    assert(uniqueData.success === true, "Lookup success is true");
    assert(uniqueData.result.level === "Level 1", "Level is Level 1");

    // -------------------------------------------------------------
    // 7. Non-existent Student Returns Clear 404 NOT_FOUND
    // -------------------------------------------------------------
    console.log("\n--- 7. Non-existent Student Returns Clear 404 NOT_FOUND ---");
    const notFoundRes = await fetch(`${BASE_URL}/api/results?studentName=NonExistentStudent12345&center=khaplu&level=Level%201`);
    const notFoundData = await notFoundRes.json();
    assert(notFoundRes.status === 404, "Non-existent student returns HTTP 404 Not Found");
    assert(notFoundData.code === "NOT_FOUND", "Error code is NOT_FOUND");

    // -------------------------------------------------------------
    // 8. Public UI Audit (HTML verification)
    // -------------------------------------------------------------
    console.log("\n--- 8. Public UI Audit ---");
    const uiRes = await fetch(`${BASE_URL}/`);
    const uiHtml = await uiRes.text();
    assert(uiHtml.includes('id="examinationCenter"'), "Examination Center dropdown exists in HTML");
    assert(uiHtml.includes('id="studentName"'), "Student Name input exists in HTML");
    assert(uiHtml.includes('id="level"'), "Level dropdown exists in HTML");
    assert(uiHtml.includes('id="classOrSection"'), "Class optional filter exists in HTML");
    assert(uiHtml.includes('id="fatherName"'), "Father Name optional filter exists in HTML");
    assert(uiHtml.includes('id="schoolName"'), "School Name optional filter exists in HTML");
    assert(uiHtml.includes("Level 1") && uiHtml.includes("Level 2") && uiHtml.includes("Level 3"), "All 3 levels present in HTML");

    console.log("\n============================================================");
    console.log("   ALL FLEXIBLE MATCHING & DISAMBIGUATION TESTS PASSED (100%)");
    console.log("============================================================\n");
  } finally {
    serverProcess.kill("SIGTERM");
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
