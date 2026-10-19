# Triple E Organization 2nd Quiz Competition Result Portal

Official result and scorecard verification portal for the **Triple-E Organization (Gilgit-Baltistan)** 2nd Annual Quiz Competition, developed in partnership with **Siachen Mark**.

---

## 🏛️ Phase 2: Secure Google Sheets Integration

Google Sheets is the primary results database for the competition. Phase 2 introduces:
- **Independent Category Sheet Connections**: Configure a separate Google Spreadsheet URL or worksheet for each of the 3 competition categories:
  1. **Lower Class Category**
  2. **Middle Class Category**
  3. **Overall Championship Track**
- **Server-Side Service Account Integration**: Private spreadsheets stay strictly private. No public web publishing required.
- **Flexible Column Mapping**: Dynamic column alignment with automatic heuristic detection and manual overrides for:
  - Roll number (normalized, leading zeros preserved)
  - Student name
  - Father / Guardian name
  - School / Institution & District
  - Class / Section
  - Obtained marks & Total marks
  - Percentage (calculated automatically if not supplied)
  - Grade & Pass/Fail status
  - Position / Merit Rank
- **Safe Single-Record Query**: Public API never exposes full spreadsheets or bulk student lists.
- **Duplicate Roll Number Detection**: Detects collisions and rejects ambiguity (HTTP 409) rather than silently picking the first record.
- **In-Memory Rate Limiting & Caching**: Prevents Google API quota exhaustion while avoiding stale data.

---

## 🔐 Google Cloud Service Account Setup

### Step 1: Create a Service Account in Google Cloud Console
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project or create a new one (e.g., `triple-e-competitions`).
3. Enable the **Google Sheets API** under **APIs & Services > Library**.
4. Go to **IAM & Admin > Service Accounts** and click **Create Service Account**.
5. Set Name: `triple-e-sheets-sync` and finish creation.
6. Click on the created service account > **Keys** tab > **Add Key > Create new key** > Choose **JSON**.
7. Download the keyfile securely.

### Step 2: Configure Server Environment Variables
In your server's `.env.local` (never committed to Git):
```env
# Extract 'client_email' and 'private_key' from the downloaded JSON:
GOOGLE_SERVICE_ACCOUNT_EMAIL="triple-e-sheets-sync@triple-e-org.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Admin Authentication Secret for configuration endpoints:
ADMIN_ACCESS_SECRET="triple-e-secret-key-2026"
```

### Step 3: Share Competition Spreadsheets
Open each category's Google Spreadsheet:
1. Click **Share** (top right).
2. Paste the Service Account email (`GOOGLE_SERVICE_ACCOUNT_EMAIL`).
3. Set role to **Viewer**.
4. Uncheck "Notify people" and click **Share**.

---

## 🧪 Automated Test Suite

Run the automated test suite verifying all 7 security and functional criteria:

```bash
# Start the production build or server
npm run build
npx next start -p 3008

# In another terminal:
node src/test-phase2.mjs
```

### Verified Test Assertions:
- ✅ **Category Independence**: Lower, Middle, and Overall categories resolve independently to distinct sheets/worksheets.
- ✅ **Preservation of Leading Zeros**: Numbers like `0042`, `0088`, and `0007` are preserved exactly without numeric conversion.
- ✅ **Duplicate Roll Number Collision Handling**: Ambiguous duplicate entries trigger HTTP 409 Conflict.
- ✅ **Invalid Spreadsheet ID Diagnostics**: Non-existent sheets produce diagnostic messages.
- ✅ **Permission Diagnostics**: Unshared sheets produce clear 403 guidance with service account instructions.
- ✅ **Public API Protection**: Requests without a roll number are rejected (HTTP 400); bulk lists cannot be dumped.
- ✅ **Admin Auth Enforcement**: Unauthenticated configuration modifications are rejected (HTTP 401).
- ✅ **Zero Credential Leakage**: No private keys or secrets are exposed in API responses or client bundles.

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run ESLint validation
npm run lint

# Build production bundle
npm run build

# Start production server
npm run start
```
