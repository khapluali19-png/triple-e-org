import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 3016;
const BASE_URL = `http://localhost:${PORT}`;
const DEBUG_PORT = 9222;

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

async function sendCdpCommand(ws, method, params = {}, id = 1) {
  return new Promise((resolve, reject) => {
    const handleMsg = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener("message", handleMsg);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } catch (e) {
        // ignore other messages
      }
    };
    ws.addEventListener("message", handleMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function testPrintVerification() {
  console.log("\n==================================================================");
  console.log("   TRIPLE E - PRINT & PDF SINGLE-PAGE CERTIFICATE QA TEST         ");
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
      shell: true,
      stdio: "ignore"
    }
  );

  let chromeProcess = null;

  try {
    await waitForServer(BASE_URL);
    console.log(`[Setup] Next.js test server is online at ${BASE_URL}\n`);

    // 1. Launch Chrome with CDP
    console.log("--- Step 1: Launch Chrome with DevTools Protocol ---");
    const browserPath = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

    chromeProcess = spawn(
      browserPath,
      [
        "--headless=new",
        `--remote-debugging-port=${DEBUG_PORT}`,
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1280,900"
      ],
      { stdio: "ignore" }
    );

    await new Promise((r) => setTimeout(r, 2000));

    const targetUrl = `${BASE_URL}/#result-lookup`;
    const tabRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(targetUrl)}`, {
      method: "PUT"
    });
    const tabData = await tabRes.json();
    const wsUrl = tabData.webSocketDebuggerUrl;
    assert(!!wsUrl, "Chrome WebSocket debugger target acquired");

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    await sendCdpCommand(ws, "Page.enable", {}, 2);
    await sendCdpCommand(ws, "Runtime.enable", {}, 3);
    await new Promise((r) => setTimeout(r, 2000));

    // Test Case A: Standard Student (Ali Raza)
    console.log("\n--- Step 2: Test Standard Student (Ali Raza) ---");
    await sendCdpCommand(ws, "Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const btn = buttons.find(b => b.textContent && b.textContent.includes("Ali Raza"));
          if (btn) btn.click();
        })()
      `
    }, 4);

    await new Promise((r) => setTimeout(r, 1500));

    const pdfA = await sendCdpCommand(ws, "Page.printToPDF", {
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0
    }, 5);

    const pdfBufA = Buffer.from(pdfA.data, "base64");
    const countA = (pdfBufA.toString("binary").match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log(`  Ali Raza PDF size: ${pdfBufA.length} bytes, page count: ${countA}`);
    assert(countA === 1, "Ali Raza certificate is exactly 1 page");

    // Test Case B: Student with missing optional fields (Amina Bibi - blank father)
    console.log("\n--- Step 3: Test Student with Missing Optional Fields (Amina Bibi) ---");
    await sendCdpCommand(ws, "Runtime.evaluate", {
      expression: `
        (() => {
          const resetBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Search Another Result"));
          if (resetBtn) resetBtn.click();
        })()
      `
    }, 10);
    await new Promise((r) => setTimeout(r, 500));

    await sendCdpCommand(ws, "Runtime.evaluate", {
      expression: `
        (() => {
          const nameInput = document.querySelector("#result-lookup input[type='text']");
          if (nameInput) {
            nameInput.value = "Amina Bibi";
            nameInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
          const form = document.querySelector("#result-lookup form");
          if (form) {
            form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          }
        })()
      `
    }, 11);
    await new Promise((r) => setTimeout(r, 1500));

    const pdfB = await sendCdpCommand(ws, "Page.printToPDF", {
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0
    }, 12);

    const pdfBufB = Buffer.from(pdfB.data, "base64");
    const countB = (pdfBufB.toString("binary").match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log(`  Amina Bibi PDF size: ${pdfBufB.length} bytes, page count: ${countB}`);
    assert(countB === 1, "Amina Bibi certificate is exactly 1 page");

    // Test Case C: Very Long Student Name
    console.log("\n--- Step 4: Test Very Long Student Name Layout ---");
    await sendCdpCommand(ws, "Runtime.evaluate", {
      expression: `
        (() => {
          const studentEl = document.querySelector(".cert-student-name");
          if (studentEl) {
            studentEl.textContent = "Syed Muhammad Baqir Ali Shah Rizvi Al-Hussaini";
          }
          const schoolEl = document.querySelector(".cert-col-right .cert-result-value");
          if (schoolEl) {
            schoolEl.textContent = "Army Public School and College Higher Secondary Wing Khaplu Campus";
          }
        })()
      `
    }, 20);
    await new Promise((r) => setTimeout(r, 500));

    const pdfC = await sendCdpCommand(ws, "Page.printToPDF", {
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0
    }, 21);

    const pdfBufC = Buffer.from(pdfC.data, "base64");
    const countC = (pdfBufC.toString("binary").match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log(`  Long Name PDF size: ${pdfBufC.length} bytes, page count: ${countC}`);
    assert(countC === 1, "Long student name certificate remains strictly on 1 page without spillover");

    ws.close();

    console.log("\n==================================================================");
    console.log("   🎉 ALL PRINT & SINGLE-PAGE QA SCENARIOS PASSED WITH ZERO ERRORS! ");
    console.log("==================================================================\n");

  } finally {
    if (chromeProcess) {
      console.log("[Teardown] Closing Chrome browser process...");
      chromeProcess.kill("SIGKILL");
    }
    console.log("[Teardown] Shutting down Next.js test server...");
    serverProcess.kill("SIGTERM");
  }
}

testPrintVerification().catch((err) => {
  console.error("\n❌ QA Test Failed:", err);
  process.exit(1);
});
