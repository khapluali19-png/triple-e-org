/**
 * Triple E Organization 2nd Quiz Competition
 * Automated Verification Suite for Level Dropdown Search & Duplicate Disambiguation
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

async function runLevelSearchTests() {
  console.log("\n============================================================");
  console.log("   TRIPLE E - LEVEL DROPDOWN & DUPLICATE DISAMBIGUATION QA   ");
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
    // Test 1: Unique Student in Level 1 (Sairaa in Dumsum) without Father Name
    // -------------------------------------------------------------
    console.log("--- Test 1: Unique Student in Level 1 without Father Name ---");
    const res1 = await fetch(`${BASE_URL}/api/results?studentName=Sairaa&center=dumsum&level=Level%201`);
    const data1 = await res1.json();
    assert(res1.status === 200, "Sairaa in Dumsum Level 1 returns HTTP 200 OK");
    assert(data1.success === true, "Result lookup success is true");
    assert(data1.result.studentName.toLowerCase().includes("sairaa"), "Student name contains Sairaa");
    assert(data1.result.level === "Level 1", "Result level is Level 1");
    assert(data1.result.levelDescription === "Classes 4 to 8", "Level description is Classes 4 to 8");

    // -------------------------------------------------------------
    // Test 2: Search with Wrong Level returns NOT_FOUND
    // -------------------------------------------------------------
    console.log("\n--- Test 2: Search with Wrong Level returns NOT_FOUND ---");
    const res2 = await fetch(`${BASE_URL}/api/results?studentName=Sairaa&center=dumsum&level=Level%203`);
    const data2 = await res2.json();
    assert(res2.status === 404, "Searching Sairaa with Level 3 returns HTTP 404 Not Found");
    assert(data2.code === "NOT_FOUND", "Error code is NOT_FOUND");
    assert(data2.message.includes("Level 3"), "Error message clarifies Level 3 mismatch");

    // -------------------------------------------------------------
    // Test 3: Duplicate Student in Same Level without Father Name Prompts for Disambiguation
    // (Arifa Batool in Ghursay Level 2 has 2 records)
    // -------------------------------------------------------------
    console.log("\n--- Test 3: Duplicate Student in Same Level without Father Name ---");
    const res3 = await fetch(`${BASE_URL}/api/results?studentName=Arifa%20Batool&center=ghursay&level=Level%202`);
    const data3 = await res3.json();
    assert(res3.status === 400, "Duplicate candidate returns HTTP 400 Ambiguity");
    assert(data3.code === "AMBIGUOUS_STUDENT", "Error code is AMBIGUOUS_STUDENT");
    assert(data3.ambiguityDetected === true, "ambiguityDetected is true");
    assert(data3.message.toLowerCase().includes("father's name"), "Message prompts to enter Father's Name");

    // -------------------------------------------------------------
    // Test 4: Duplicate Student Resolved with Father Name
    // -------------------------------------------------------------
    console.log("\n--- Test 4: Duplicate Student Resolved with Father Name ---");
    const res4 = await fetch(`${BASE_URL}/api/results?studentName=Arifa%20Batool&center=ghursay&level=Level%202&fatherName=Ghulam%20Abbas`);
    const data4 = await res4.json();
    assert(res4.status === 200, "Arifa Batool with Father Ghulam Abbas returns HTTP 200 OK");
    assert(data4.success === true, "Result lookup success is true");
    assert(data4.result.fatherName.toLowerCase().includes("ghulam abbas"), "Resolved to candidate with Father Ghulam Abbas");
    assert(data4.result.level === "Level 2", "Result level is Level 2");

    // -------------------------------------------------------------
    // Test 5: Verify Another Candidate with Level 1 (Own Ali in Ghursay)
    // -------------------------------------------------------------
    console.log("\n--- Test 5: Own Ali in Ghursay Level 1 ---");
    const res5 = await fetch(`${BASE_URL}/api/results?studentName=Own%20Ali&center=ghursay&level=Level%201`);
    const data5 = await res5.json();
    assert(res5.status === 200, "Own Ali in Ghursay Level 1 returns HTTP 200 OK");
    assert(data5.result.studentName.toLowerCase().includes("own ali") || data5.result.studentName.toLowerCase().includes("awn"), "Matches Own Ali");
    assert(data5.result.level === "Level 1", "Level is Level 1");

    // -------------------------------------------------------------
    // Test 6: Verify HTML renders Help Section and Level dropdown
    // -------------------------------------------------------------
    console.log("\n--- Test 6: Verify HTML renders Help Section and Level dropdown ---");
    const pageRes = await fetch(`${BASE_URL}/`);
    const pageHtml = await pageRes.text();
    assert(pageHtml.includes("How to Check Your Result"), "Page contains 'How to Check Your Result' heading");
    assert(pageHtml.includes("Select your examination center and level, then enter your name to search."), "Step 1 text present");
    assert(pageHtml.includes("If multiple candidates have the same name, enter your father"), "Step 2 text present");
    assert(pageHtml.includes("If your result is still not found, you may not have provided your father"), "Step 3 text present");
    assert(pageHtml.includes("Level 1") && pageHtml.includes("Level 2") && pageHtml.includes("Level 3"), "Level dropdown options present");

    console.log("\n============================================================");
    console.log("   ALL LEVEL SEARCH & AMBIGUITY TESTS PASSED SUCCESSFULLY!  ");
    console.log("============================================================\n");
  } finally {
    serverProcess.kill("SIGTERM");
  }
}

runLevelSearchTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
