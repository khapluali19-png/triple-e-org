import assert from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 3020;
const BASE_URL = `http://localhost:${PORT}`;

console.log("==================================================================");
console.log("   TRIPLE E - ADMIN EMAIL & CHANGE PASSWORD QA VERIFICATION       ");
console.log("==================================================================");

let serverProcess;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  console.log(`\n[Setup] Spawning Next.js server on port ${PORT}...`);
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

async function runTests() {
  try {
    await startServer();

    // -------------------------------------------------------------
    // Scenario 1: Email Input Field Shows abx@triple-e-.com As Default
    // -------------------------------------------------------------
    console.log("\n--- Scenario 1: Email Input Field Shows abx@triple-e-.com ---");
    const loginPageRes = await fetch(`${BASE_URL}/admin/login`);
    assert(loginPageRes.status === 200, "Login page returns HTTP 200");
    const loginHtml = await loginPageRes.text();

    assert(loginHtml.includes("abx@triple-e-.com"), "Login HTML contains default email abx@triple-e-.com");
    assert(loginHtml.includes("placeholder=\"abx@triple-e-.com\""), "Login input has placeholder abx@triple-e-.com");
    console.log("  ✔ [PASS] Email input field shows abx@triple-e-.com by default");

    // -------------------------------------------------------------
    // Scenario 2: Login with abx@triple-e-.com succeeds
    // -------------------------------------------------------------
    console.log("\n--- Scenario 2: Login with abx@triple-e-.com ---");
    const login1Res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "abx@triple-e-.com",
        password: "ali12345",
      }),
    });
    assert(login1Res.status === 200, "Login with abx@triple-e-.com returns HTTP 200");
    const login1Data = await login1Res.json();
    assert(login1Data.success === true, "Login success is true");
    const sessionCookie = login1Res.headers.get("set-cookie")?.split(";")[0];
    assert(sessionCookie, "Session cookie received");
    console.log("  ✔ [PASS] Admin successfully logs in using default email abx@triple-e-.com");

    // -------------------------------------------------------------
    // Scenario 3: Login with saved email khapluali19@gmail.com succeeds & email not overwritten
    // -------------------------------------------------------------
    console.log("\n--- Scenario 3: Login with saved email & verify no automatic overwrite ---");
    const login2Res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "khapluali19@gmail.com",
        password: "ali12345",
      }),
    });
    assert(login2Res.status === 200, "Login with khapluali19@gmail.com returns HTTP 200");
    const authJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/admin-auth.json"), "utf-8"));
    assert(authJson.email === "khapluali19@gmail.com", "Saved administrator email was preserved and not overwritten");
    console.log("  ✔ [PASS] Saved administrator email is preserved without being overwritten automatically");

    // -------------------------------------------------------------
    // Scenario 4: Change Password Verification - Unauthenticated Rejected
    // -------------------------------------------------------------
    console.log("\n--- Scenario 4: Unauthenticated Change Password Request Rejected ---");
    const unauthRes = await fetch(`${BASE_URL}/api/admin/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "ali12345",
        newPassword: "NewSecret2026!",
        confirmPassword: "NewSecret2026!",
      }),
    });
    assert(unauthRes.status === 401, "Unauthenticated request returns HTTP 401");
    console.log("  ✔ [PASS] Unauthorized change password attempt correctly rejected with HTTP 401");

    // -------------------------------------------------------------
    // Scenario 5: Change Password - Wrong Current Password Rejected
    // -------------------------------------------------------------
    console.log("\n--- Scenario 5: Wrong Current Password Rejected ---");
    const wrongCurrentRes = await fetch(`${BASE_URL}/api/admin/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: "wrongpassword999",
        newPassword: "NewSecret2026!",
        confirmPassword: "NewSecret2026!",
      }),
    });
    assert(wrongCurrentRes.status === 400, "Wrong current password returns HTTP 400");
    const wrongCurrentData = await wrongCurrentRes.json();
    assert(wrongCurrentData.message.includes("Current password does not match"), "Error message explains current password mismatch");
    console.log("  ✔ [PASS] Incorrect current password properly verified and rejected");

    // -------------------------------------------------------------
    // Scenario 6: Change Password - Mismatched Confirmation Rejected
    // -------------------------------------------------------------
    console.log("\n--- Scenario 6: Mismatched Password Confirmation Rejected ---");
    const mismatchRes = await fetch(`${BASE_URL}/api/admin/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: "ali12345",
        newPassword: "NewSecret2026!",
        confirmPassword: "DifferentConfirmation999!",
      }),
    });
    assert(mismatchRes.status === 400, "Mismatched confirmation returns HTTP 400");
    const mismatchData = await mismatchRes.json();
    assert(mismatchData.message.includes("match"), "Error message explains confirmation mismatch");
    console.log("  ✔ [PASS] Mismatched confirmation password rejected");

    // -------------------------------------------------------------
    // Scenario 7: Successful Password Update with Bcrypt
    // -------------------------------------------------------------
    console.log("\n--- Scenario 7: Successful Password Update ---");
    const newSecret = "TripleE@Security2026!";
    const changeRes = await fetch(`${BASE_URL}/api/admin/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: "ali12345",
        newPassword: newSecret,
        confirmPassword: newSecret,
      }),
    });
    assert(changeRes.status === 200, "Change password returns HTTP 200");
    const changeData = await changeRes.json();
    assert(changeData.success === true, "Change password response success is true");
    assert(!changeData.passwordHash, "Password hash is NOT exposed in response");
    console.log("  ✔ [PASS] Password updated successfully without exposing raw hash");

    // -------------------------------------------------------------
    // Scenario 8: Old Password No Longer Works
    // -------------------------------------------------------------
    console.log("\n--- Scenario 8: Old Password No Longer Works ---");
    const oldLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "abx@triple-e-.com",
        password: "ali12345", // OLD password
      }),
    });
    assert(oldLoginRes.status === 400 || oldLoginRes.status === 401, "Old password rejected");
    const oldLoginData = await oldLoginRes.json();
    assert(oldLoginData.success === false, "Old password cannot log in");
    console.log("  ✔ [PASS] Old password successfully invalidated and cannot log in");

    // -------------------------------------------------------------
    // Scenario 9: New Password Works For Next Login
    // -------------------------------------------------------------
    console.log("\n--- Scenario 9: New Password Works For Next Login ---");
    const newLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "abx@triple-e-.com",
        password: newSecret, // NEW password
      }),
    });
    assert(newLoginRes.status === 200, "New password returns HTTP 200 OK");
    const newLoginData = await newLoginRes.json();
    assert(newLoginData.success === true, "New password authentication succeeds");
    const newSessionCookie = newLoginRes.headers.get("set-cookie")?.split(";")[0];
    assert(newSessionCookie, "New session cookie created");
    console.log("  ✔ [PASS] New password authenticated successfully for next login");

    // -------------------------------------------------------------
    // Scenario 10: Restore Baseline Password
    // -------------------------------------------------------------
    console.log("\n--- Scenario 10: Restore Baseline Password ---");
    const restoreRes = await fetch(`${BASE_URL}/api/admin/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": newSessionCookie,
      },
      body: JSON.stringify({
        currentPassword: newSecret,
        newPassword: "ali12345",
        confirmPassword: "ali12345",
      }),
    });
    assert(restoreRes.status === 200, "Restore to ali12345 returns HTTP 200");
    console.log("  ✔ [PASS] Baseline password restored cleanly");

    // -------------------------------------------------------------
    // Scenario 11: Admin Panel UI Verification
    // -------------------------------------------------------------
    console.log("\n--- Scenario 11: Admin Panel UI Verification ---");
    const adminPanelRes = await fetch(`${BASE_URL}/admin`, {
      headers: { "Cookie": newSessionCookie },
    });
    assert(adminPanelRes.status === 200, "Admin dashboard returns HTTP 200");
    const adminHtml = await adminPanelRes.text();
    assert(adminHtml.includes("Change Password"), "Admin panel includes Change Password button");
    assert(adminHtml.includes("abx@triple-e-.com"), "Admin panel shows abx@triple-e-.com as default value");
    console.log("  ✔ [PASS] Admin panel contains Change Password option and default email display");

    console.log("\n==================================================================");
    console.log("   🎉 ALL 11 ADMIN AUTH & PASSWORD SCENARIOS PASSED WITH ZERO ERRORS!");
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
