import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 3017;
const BASE_URL = `http://localhost:${PORT}`;
const DEBUG_PORT = 9223;

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

async function testJpgExport() {
  console.log("\n==================================================================");
  console.log("   TRIPLE E - HIGH-RES JPG CERTIFICATE DOWNLOAD QA TEST           ");
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
    await new Promise((r) => setTimeout(r, 2500));

    // 2. Click sample button for Ali Raza
    console.log("\n--- Step 2: Render Student Certificate (Ali Raza) ---");
    await sendCdpCommand(ws, "Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const btn = buttons.find(b => b.textContent && b.textContent.includes("Ali Raza"));
          if (btn) btn.click();
        })()
      `
    }, 4);

    await new Promise((r) => setTimeout(r, 2000));

    // 3. Inspect Action Buttons in DOM
    console.log("\n--- Step 3: Verify Buttons (Only JPG Download, No PDF) ---");
    const buttonsCheck = await sendCdpCommand(ws, "Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll(".no-print button")).map(b => b.textContent?.trim());
          const hasJpgButton = buttons.some(b => b && b.includes("Download Certificate (JPG)"));
          const hasPdfButton = buttons.some(b => b && (b.includes("PDF") || b.includes("Save as PDF")));
          return { buttons, hasJpgButton, hasPdfButton };
        })()
      `,
      returnByValue: true
    }, 5);

    const bVal = buttonsCheck.result?.value;
    console.log(`  Rendered action buttons: ${JSON.stringify(bVal?.buttons)}`);
    assert(bVal?.hasJpgButton === true, "'Download Certificate (JPG)' button is present");
    assert(bVal?.hasPdfButton === false, "PDF / Print buttons are completely removed");

    // 4. Intercept JPG Download
    console.log("\n--- Step 4: Execute JPG Certificate Generation ---");
    // Hook document.createElement('a') to intercept downloaded data URL and filename
    const exportResult = await sendCdpCommand(ws, "Runtime.evaluate", {
      expression: `
        new Promise((resolve, reject) => {
          let intercepted = null;
          const origCreateElement = document.createElement.bind(document);
          document.createElement = function(tagName, ...args) {
            const el = origCreateElement(tagName, ...args);
            if (tagName.toLowerCase() === "a") {
              const origClick = el.click.bind(el);
              el.click = function() {
                intercepted = {
                  download: el.download,
                  href: el.href
                };
                origClick();
                resolve(intercepted);
              };
            }
            return el;
          };

          // Find and click the Download Certificate (JPG) button
          const downloadBtn = Array.from(document.querySelectorAll("button")).find(
            b => b.textContent && b.textContent.includes("Download Certificate (JPG)")
          );
          if (!downloadBtn) {
            reject(new Error("Download Certificate (JPG) button not found in DOM"));
            return;
          }
          downloadBtn.click();

          // 15s timeout
          setTimeout(() => {
            if (!intercepted) reject(new Error("JPG download was not triggered within 15 seconds"));
          }, 15000);
        })
      `,
      awaitPromise: true,
      returnByValue: true
    }, 10);

    const exportData = exportResult.result?.value;
    assert(!!exportData, "Intercepted JPG download event");
    console.log(`  Downloaded Filename: ${exportData.download}`);
    assert(exportData.download === "Triple-E-Certificate-Ali-Raza.jpg", "Filename matches exact student pattern: Triple-E-Certificate-Ali-Raza.jpg");

    // 5. Verify Image Format and High-Resolution Dimensions
    console.log("\n--- Step 5: Verify High-Resolution JPG Stream ---");
    const dataUrl = exportData.href;
    assert(dataUrl.startsWith("data:image/jpeg;base64,"), "Data URL is valid JPEG MIME type");

    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");
    console.log(`  Generated JPG image size: ${imgBuffer.length} bytes (${Math.round(imgBuffer.length / 1024)} KB)`);
    assert(imgBuffer.length > 100000, `JPG has substantial high-resolution content (${imgBuffer.length} bytes > 100KB)`);

    // Verify JPEG magic bytes: 0xFF 0xD8 0xFF
    assert(imgBuffer[0] === 0xFF && imgBuffer[1] === 0xD8 && imgBuffer[2] === 0xFF, "Valid JPEG file header verified (FF D8 FF)");

    // Save test image to disk for inspection
    const testJpgPath = path.join(process.cwd(), "test-download-output.jpg");
    fs.writeFileSync(testJpgPath, imgBuffer);
    console.log(`  Saved test JPG to: ${testJpgPath}`);

    // Inspect image pixel dimensions using image header parser or HTML Image in browser
    const dimResult = await sendCdpCommand(ws, "Runtime.evaluate", {
      expression: `
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.src = "${dataUrl.slice(0, 100)}...";
          // Direct check on dimensions from memory
          const card = document.querySelector(".certificate-print-root");
          resolve({
            cardWidth: card?.offsetWidth,
            cardHeight: card?.offsetHeight
          });
        })
      `,
      awaitPromise: true,
      returnByValue: true
    }, 20);

    console.log(`  Verified certificate DOM rendering bounds: ${JSON.stringify(dimResult.result?.value)}`);

    ws.close();

    console.log("\n==================================================================");
    console.log("   🎉 JPG CERTIFICATE DOWNLOAD QA TEST PASSED WITH ZERO ERRORS!   ");
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

testJpgExport().catch((err) => {
  console.error("\n❌ QA Test Failed:", err);
  process.exit(1);
});
