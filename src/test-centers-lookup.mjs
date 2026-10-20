/**
 * Triple E Organization 2nd Quiz Competition
 * Comprehensive Verification Suite for 15 Examination Centers & Student Name Search
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 3014;
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

async function runCentersVerificationSuite() {
  console.log("\n==================================================================");
  console.log("   TRIPLE E - 15 EXAMINATION CENTERS & STUDENT NAME SEARCH QA     ");
  console.log("==================================================================\n");

  const useProd = fs.existsSync(path.join(process.cwd(), ".next"));
  console.log(`[Setup] Spawning Next.js server (${useProd ? "production" : "dev"}) on port ${PORT}...`);
  const serverProcess = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", useProd ? "start" : "dev", "-p", String(PORT)],
    {
      cwd: process.cwd(),
      env: { 
        ...process.env, 
        PORT: String(PORT),
        NODE_OPTIONS: "--max-old-space-size=4096"
      },
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
    // SCENARIO 1: Valid student name + correct center returns result
    // =============================================================
    console.log("--- Scenario 1: Valid student name + correct center ---");
    const res1 = await fetch(
      `${BASE_URL}/api/results?studentName=Ali%20Raza&center=khaplu`
    );
    const data1 = await res1.json();
    assert(res1.status === 200, "Ali Raza in Khaplu returns HTTP 200");
    assert(data1.success === true, "Lookup success is true");
    assert(data1.result.studentName === "Ali Raza", "Student name matches: Ali Raza");
    assert(data1.result.obtainedMarks === 94, "Obtained marks: 94");
    assert(data1.result.totalMarks === 100, "Total marks: 100");
    assert(data1.result.percentage === 94, "Percentage: 94%");
    assert(data1.result.grade === "A+", "Dynamic grade calculated: A+");
    assert(data1.result.level === "Level 1", "Level matches: Level 1");
    assert(data1.result.levelDescription === "Classes 4 to 8", "Level description: Classes 4 to 8");
    assert(data1.result.examinationCenter === "Khaplu", "Examination center: Khaplu");

    // =============================================================
    // SCENARIO 2: Missing father name does not prevent unique match
    // =============================================================
    console.log("\n--- Scenario 2: Missing father name does not prevent unique match ---");
    // (a) Unique student looked up without providing father name
    assert(data1.result.studentName === "Ali Raza", "Ali Raza found without entering father name");
    
    // (b) Unique student whose father name is blank in spreadsheet
    const res2 = await fetch(
      `${BASE_URL}/api/results?studentName=Amina%20Bibi&center=khaplu`
    );
    const data2 = await res2.json();
    assert(res2.status === 200, "Amina Bibi returns HTTP 200");
    assert(data2.success === true, "Amina Bibi (blank father in sheet) resolved successfully");
    assert(data2.result.obtainedMarks === 89, "Obtained marks: 89");

    // =============================================================
    // SCENARIO 3: Missing school name does not prevent unique match
    // =============================================================
    console.log("\n--- Scenario 3: Missing school name does not prevent unique match ---");
    // Student Tariq Aziz whose school is blank in the spreadsheet
    const res3 = await fetch(
      `${BASE_URL}/api/results?studentName=Tariq%20Aziz&center=khaplu`
    );
    const data3 = await res3.json();
    assert(res3.status === 200, "Tariq Aziz returns HTTP 200");
    assert(data3.success === true, "Tariq Aziz (blank school in sheet) resolved successfully");
    assert(data3.result.obtainedMarks === 77, "Obtained marks: 77");

    // =============================================================
    // SCENARIO 4: Wrong father name rejects match
    // =============================================================
    console.log("\n--- Scenario 4: Wrong father name rejects match ---");
    const res4 = await fetch(
      `${BASE_URL}/api/results?studentName=Ali%20Raza&center=khaplu&fatherName=CompletelyWrongFather`
    );
    const data4 = await res4.json();
    assert(data4.success === false, "Wrong father name prevents incorrect candidate match");
    assert(
      data4.code === "VERIFICATION_FAILED" || data4.code === "NOT_FOUND",
      `Expected verification error code, received: ${data4.code}`
    );

    // =============================================================
    // SCENARIO 5: Disambiguation by Father Name and School Name
    // =============================================================
    console.log("\n--- Scenario 5: Disambiguation of identical candidate names ---");
    // (a) Disambiguate by Father Name (Zahid Hussain with Ahmad vs Ibrahim)
    const res5a = await fetch(
      `${BASE_URL}/api/results?studentName=Zahid%20Hussain&center=khaplu&fatherName=Ahmad`
    );
    const data5a = await res5a.json();
    assert(data5a.success === true, "Zahid Hussain (Father: Ahmad) resolved successfully");
    assert(data5a.result.obtainedMarks === 75, "Marks 75 for Zahid Hussain s/o Ahmad");

    const res5b = await fetch(
      `${BASE_URL}/api/results?studentName=Zahid%20Hussain&center=khaplu&fatherName=Ibrahim`
    );
    const data5b = await res5b.json();
    assert(data5b.success === true, "Zahid Hussain (Father: Ibrahim) resolved successfully");
    assert(data5b.result.obtainedMarks === 78, "Marks 78 for Zahid Hussain s/o Ibrahim");

    // (b) Disambiguate by School Name (Sajjad Ali at School A vs School B)
    const res5c = await fetch(
      `${BASE_URL}/api/results?studentName=Sajjad%20Ali&center=khaplu&schoolName=School%20A`
    );
    const data5c = await res5c.json();
    assert(data5c.success === true, "Sajjad Ali at School A resolved successfully");
    assert(data5c.result.obtainedMarks === 82, "Marks 82 for Sajjad Ali at School A");

    const res5d = await fetch(
      `${BASE_URL}/api/results?studentName=Sajjad%20Ali&center=khaplu&schoolName=School%20B`
    );
    const data5d = await res5d.json();
    assert(data5d.success === true, "Sajjad Ali at School B resolved successfully");
    assert(data5d.result.obtainedMarks === 84, "Marks 84 for Sajjad Ali at School B");

    // =============================================================
    // SCENARIO 6: Duplicate names without verification return AMBIGUOUS_STUDENT
    // =============================================================
    console.log("\n--- Scenario 6: Ambiguous student without verification ---");
    const res6a = await fetch(
      `${BASE_URL}/api/results?studentName=Muhammad%20Ali&center=khaplu`
    );
    const data6a = await res6a.json();
    assert(data6a.success === false, "Ambiguous student without verification returns success=false");
    assert(data6a.code === "AMBIGUOUS_STUDENT", "Error code is AMBIGUOUS_STUDENT");
    assert(data6a.ambiguityDetected === true, "ambiguityDetected flag is true");

    // Resolving ambiguity with father name
    const res6b = await fetch(
      `${BASE_URL}/api/results?studentName=Muhammad%20Ali&center=khaplu&fatherName=Hassan`
    );
    const data6b = await res6b.json();
    assert(data6b.success === true, "Muhammad Ali disambiguated with father 'Hassan'");
    assert(data6b.result.obtainedMarks === 80, "Marks 80 for Muhammad Ali s/o Hassan");

    // =============================================================
    // SCENARIO 7: Unconnected center produces CENTER_NOT_CONFIGURED
    // =============================================================
    console.log("\n--- Scenario 7: Unconnected center produces clear message ---");
    const res7 = await fetch(
      `${BASE_URL}/api/results?studentName=Any%20Student&center=dumsum`
    );
    const data7 = await res7.json();
    assert(data7.success === false, "Unconnected center returns success=false");
    assert(
      data7.code === "CENTER_NOT_CONFIGURED",
      `Expected code CENTER_NOT_CONFIGURED, got ${data7.code}`
    );
    assert(
      data7.message.includes("not yet connected") || data7.message.includes("Dumsum"),
      "Message explains that the sheet has not been connected yet"
    );

    // =============================================================
    // SCENARIO 8: Cross-center isolation
    // =============================================================
    console.log("\n--- Scenario 8: Cross-center sheet isolation ---");
    // Ilyas Khan is enrolled at Keris
    const res8a = await fetch(
      `${BASE_URL}/api/results?studentName=Ilyas%20Khan&center=keris`
    );
    const data8a = await res8a.json();
    assert(data8a.success === true, "Ilyas Khan found in Keris center");
    assert(data8a.result.obtainedMarks === 86, "Marks: 86 in Keris");

    // Searching Ilyas Khan in Khaplu must return NOT_FOUND
    const res8b = await fetch(
      `${BASE_URL}/api/results?studentName=Ilyas%20Khan&center=khaplu`
    );
    const data8b = await res8b.json();
    assert(data8b.success === false, "Ilyas Khan NOT found in Khaplu (strict center isolation)");

    // Mehdi Hassan is enrolled at Kharfaq
    const res8c = await fetch(
      `${BASE_URL}/api/results?studentName=Mehdi%20Hassan&center=kharfaq`
    );
    const data8c = await res8c.json();
    assert(data8c.success === true, "Mehdi Hassan found in Kharfaq center");

    const res8d = await fetch(
      `${BASE_URL}/api/results?studentName=Mehdi%20Hassan&center=keris`
    );
    const data8d = await res8d.json();
    assert(data8d.success === false, "Mehdi Hassan NOT found in Keris");

    // =============================================================
    // SCENARIO 9: Missing optional columns do not break result card
    // =============================================================
    console.log("\n--- Scenario 9: Missing optional columns handled cleanly ---");
    // Batool Fatima has blank roll number, blank class, blank tehsil
    const res9 = await fetch(
      `${BASE_URL}/api/results?studentName=Batool%20Fatima&center=khaplu`
    );
    const data9 = await res9.json();
    assert(data9.success === true, "Batool Fatima resolved without errors");
    assert(data9.result.obtainedMarks === 90, "Marks: 90");
    assert(!data9.result.rollNumber, "Roll number is undefined/omitted cleanly without 'null'");
    assert(!data9.result.classOrSection, "Class is undefined/omitted cleanly");

    // =============================================================
    // SCENARIO 10: Levels (Level 1, 2, 3) and percentage calculation
    // =============================================================
    console.log("\n--- Scenario 10: Levels and percentage evaluation ---");
    // Level 1: Ali Raza
    assert(data1.result.level === "Level 1", "Ali Raza is Level 1");
    assert(data1.result.levelDescription === "Classes 4 to 8", "Level 1 description: Classes 4 to 8");

    // Level 2: Fatima Zahra
    const res10b = await fetch(
      `${BASE_URL}/api/results?studentName=Fatima%20Zahra&center=khaplu`
    );
    const data10b = await res10b.json();
    assert(data10b.success === true, "Fatima Zahra resolved");
    assert(data10b.result.level === "Level 2", "Fatima Zahra is Level 2");
    assert(data10b.result.levelDescription === "Classes 8 to 12", "Level 2 description: Classes 8 to 12");

    // Level 3: Kareem Ullah
    const res10c = await fetch(
      `${BASE_URL}/api/results?studentName=Kareem%20Ullah&center=khaplu`
    );
    const data10c = await res10c.json();
    assert(data10c.success === true, "Kareem Ullah resolved");
    assert(data10c.result.level === "Level 3", "Kareem Ullah is Level 3");
    assert(data10c.result.levelDescription === "Open for all", "Level 3 description: Open for all");

    // =============================================================
    // SCENARIO 11: Sponsorship attribution verification
    // =============================================================
    console.log("\n--- Scenario 11: Sponsorship attribution verification ---");
    const homeRes = await fetch(`${BASE_URL}/`);
    const homeHtml = await homeRes.text();
    assert(
      homeHtml.includes("Siachen Mark") || homeHtml.includes("Official Sponsorship"),
      "Homepage includes official partnership attribution"
    );

    // =============================================================
    // SCENARIO 12: Admin sheet connection config save & test lookup API
    // =============================================================
    console.log("\n--- Scenario 12: Admin sheet connection config save & test lookup API ---");
    // Test candidate lookup route
    const testLookupRes = await fetch(`${BASE_URL}/api/admin/sheets/test-lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "triple-e-2026",
      },
      body: JSON.stringify({
        centerId: "khaplu",
        studentName: "Ali Raza",
      }),
    });
    const testLookupData = await testLookupRes.json();
    assert(testLookupRes.status === 200, "Admin test-lookup endpoint returns HTTP 200");
    assert(testLookupData.success === true, "Admin test-lookup succeeds for Ali Raza in Khaplu");
    assert(testLookupData.result.studentName === "Ali Raza", "Admin candidate lookup matches student");

    // Test saving center configuration route
    const configSaveRes = await fetch(`${BASE_URL}/api/admin/sheets/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "triple-e-2026",
      },
      body: JSON.stringify({
        centerId: "keris",
        connection: {
          centerId: "keris",
          centerName: "Keris",
          worksheetName: "Keris",
          status: "connected",
        },
      }),
    });
    const configSaveData = await configSaveRes.json();
    assert(configSaveRes.status === 200, "Admin config save endpoint returns HTTP 200");
    assert(configSaveData.success === true, "Admin center config save succeeds");
    assert(
      configSaveData.message.includes("Keris"),
      "Config save confirmation mentions Keris examination center"
    );

    console.log("\n==================================================================");
    console.log("   🎉 ALL 12 VERIFICATION SCENARIOS PASSED WITH ZERO ERRORS!     ");
    console.log("==================================================================\n");

  } finally {
    console.log("[Teardown] Shutting down Next.js test server...");
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(serverProcess.pid), "/f", "/t"]);
      } else {
        serverProcess.kill("SIGTERM");
      }
    } catch {
      // ignore
    }
  }
}

runCentersVerificationSuite().catch((err) => {
  console.error("\n❌ QA Verification Suite failed:", err);
  process.exit(1);
});
