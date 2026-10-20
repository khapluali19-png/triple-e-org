# Triple E Organization 2nd Quiz Competition Result Portal
## Production Deployment, Administration & Operational Handover Guide

> **Official System**: Triple E Organization 2nd Quiz Competition Official Results & Scorecard System  
> **Digital Partner**: Designed & Developed by Siachen Mark Agency • Islamabad  
> **Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS  
> **Status**: Production Ready • Verified with 100% Test Pass Rate (56/56 automated QA checks)

---

## Table of Contents
1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Directory Structure](#2-directory-structure)
3. [Environment Configuration](#3-environment-configuration)
4. [Google Cloud Service Account Setup](#4-google-cloud-service-account-setup)
5. [Administrator Authentication & Password Governance](#5-administrator-authentication--password-governance)
6. [Managing Multi-Category Google Sheets](#6-managing-multi-category-google-sheets)
7. [Branding, Ribbons & Siachen Mark Attribution](#7-branding-ribbons--siachen-mark-attribution)
8. [Production Deployment Instructions](#8-deployment-instructions)
9. [Operational Troubleshooting & Runbook](#9-operational-troubleshooting--runbook)
10. [Maintenance, Backup & Security Rotation](#10-maintenance-backup--security-rotation)

---

## 1. Project Overview & Architecture

The **Triple E Organization 2nd Quiz Competition Result Portal** is a production web application engineered for high-integrity result verification. It features:

- **Public Experience**:
  - Two-step student lookup: Category Selection (`Lower Class`, `Middle Class`, `Overall Category`) + Roll Number input.
  - Strict preservation of alphanumeric roll numbers and leading zeros (e.g. `0042`, `0088`, `0007`).
  - Category isolation: records in one track cannot be accessed from another track.
  - Premium, official examination scorecard with Triple E emblem, academic summary, percentage, official rank, and subject score breakdown.
  - Dedicated `@media print` engine formatted for single-sheet **A4 Portrait** with browser print dialog integration (`window.print()`).
  - Prominent Siachen Mark Agency partner attribution with authentic logo linking to `https://siachen-mark.vercel.app/`.

- **Secure Administrator Dashboard**:
  - Bcrypt password encryption (cost 12), HttpOnly cookie session management, CSRF checks, and IP rate limiting.
  - Multi-category spreadsheet manager supporting independent Google Sheets for Lower, Middle, and Overall tracks.
  - Column mapper with automatic header detection and live preview.
  - Dynamic branding and social media management with instant public reflection without rebuilding code.

---

## 2. Directory Structure

```
Triple E/
├── public/
│   └── images/
│       ├── logos/
│       │   ├── triple-e-logo.jpg        # Authentic Triple E Organization emblem
│       │   └── siachen-mark-logo.jpg    # Authentic Siachen Mark agency emblem (1:1 aspect)
│       └── ...
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── branding/page.tsx        # Identity, ribbon, visibility & partner manager
│   │   │   ├── categories/page.tsx      # Category configuration
│   │   │   ├── login/page.tsx           # Admin login with rate limiting & security notices
│   │   │   ├── preview/page.tsx         # Live scorecard previewer for all tracks
│   │   │   ├── sheets/page.tsx          # Multi-category Google Sheets connection manager
│   │   │   ├── social/page.tsx          # Social channels manager
│   │   │   ├── layout.tsx               # Admin shell layout with session validation
│   │   │   └── page.tsx                 # Overview dashboard with health indicators
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── auth/                # Login, logout, session & password change
│   │   │   │   ├── branding/            # Branding settings API
│   │   │   │   ├── overview/            # System health metrics API
│   │   │   │   ├── sheets/config/       # Sheets connection persistence API
│   │   │   │   ├── sheets/test/         # Sheet live connectivity & preview API
│   │   │   │   └── upload/              # Image asset upload API
│   │   │   ├── branding/                # Public cached branding endpoint
│   │   │   └── results/                 # Public secure candidate result lookup API
│   │   ├── globals.css                  # Custom styling, fonts, and @media print A4 rules
│   │   ├── layout.tsx                   # Public root layout
│   │   └── page.tsx                     # Public homepage & result verification portal
│   ├── components/
│   │   ├── admin/                       # Admin navigation, modals, and status badges
│   │   └── public/
│   │       ├── Header.tsx               # Public header with category navigation
│   │       ├── Hero.tsx                 # Competition hero with dynamic headlines
│   │       ├── ResultLookup.tsx         # Two-step category & roll lookup panel
│   │       ├── ResultCard.tsx           # Premium academic scorecard
│   │       ├── CategoryCards.tsx        # Educational tiers breakdown
│   │       ├── CompetitionInfo.tsx      # Examination committee standards
│   │       └── Footer.tsx               # Footer with bottom Siachen Mark partner attribution
│   ├── data/
│   │   ├── admin-activity-log.json      # Audit trail of administrative actions
│   │   ├── admin-auth.json              # Encrypted administrator credentials
│   │   ├── branding-config.json         # Dynamic branding and partner attribution store
│   │   └── category-sheets-config.json  # Google Sheets connections & column mappings
│   ├── lib/
│   │   ├── server/
│   │   │   ├── adminAuthStore.ts        # Bcrypt auth, sessions, rate limits & logs
│   │   │   ├── brandingStore.ts         # Branding storage & URL validation
│   │   │   ├── googleSheetsService.ts   # Google Sheets API client (OAuth/Service Account)
│   │   │   └── sheetsConfigStore.ts     # Multi-category sheet store & lookup query engine
│   │   ├── constants.ts                 # Default configurations and rules
│   │   └── types.ts                     # TypeScript schemas & contracts
│   ├── test-phase4.mjs                  # Phase 4 automated verification suite
│   └── test-phase5.mjs                  # Phase 5 production QA verification suite (56 checks)
├── .env.example                         # Environment template with full documentation
├── next.config.mjs                      # Next.js optimization & security headers
├── package.json                         # Dependencies, scripts (build, test, lint)
└── tsconfig.json                        # Strict TypeScript configuration
```

---

## 3. Environment Configuration

Create a file named `.env.local` in the project root:

```env
# -----------------------------------------------------------------------------
# 1. INITIAL ADMINISTRATOR BOOTSTRAP (Server-Side Only)
# -----------------------------------------------------------------------------
INITIAL_ADMIN_EMAIL="khapluali19@gmail.com"
INITIAL_ADMIN_PASSWORD="ali12345"
ADMIN_ACCESS_SECRET="triple-e-secret-key-2026"

# -----------------------------------------------------------------------------
# 2. GOOGLE CLOUD SERVICE ACCOUNT (Server-Side Only)
# -----------------------------------------------------------------------------
GOOGLE_SERVICE_ACCOUNT_EMAIL="triple-e-sheets-sync@triple-e-org.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Optional fallback for public sheets:
GOOGLE_API_KEY=""

# -----------------------------------------------------------------------------
# 3. PUBLIC WEBSITE CONFIGURATION
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SITE_URL="https://results.triple-e.org"
```

> **Security Guarantee**: Neither `GOOGLE_PRIVATE_KEY` nor `INITIAL_ADMIN_PASSWORD` is ever exposed to frontend client bundles.

---

## 4. Google Cloud Service Account Setup

To allow the portal to read private Google Spreadsheets without making student marks public on the internet:

1. **Create a Google Cloud Project**:
   - Navigate to [Google Cloud Console](https://console.cloud.google.com).
   - Create a project named `Triple-E-Competition-Portal`.
2. **Enable Google Sheets API**:
   - Go to **APIs & Services** > **Library**.
   - Search for **Google Sheets API** and click **Enable**.
3. **Create Service Account**:
   - Go to **APIs & Services** > **Credentials** > **Create Credentials** > **Service Account**.
   - Name: `triple-e-sheets-sync`.
   - Click **Done**.
4. **Generate Private Key**:
   - Click on the created service account email.
   - Go to the **Keys** tab > **Add Key** > **Create new key** > Choose **JSON**.
   - Download the file securely.
5. **Grant Spreadsheet Access**:
   - Open each competition Google Spreadsheet in Google Drive.
   - Click **Share** at the top right.
   - Add your service account email (`triple-e-sheets-sync@triple-e-org.iam.gserviceaccount.com`).
   - Role: **Viewer**. Uncheck "Notify people", then click **Share**.
6. **Populate `.env.local`**:
   - Copy `client_email` into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - Copy `private_key` into `GOOGLE_PRIVATE_KEY`.

---

## 5. Administrator Authentication & Password Governance

### Initial Login
- **URL**: `/admin/login`
- **Initial Email**: `khapluali19@gmail.com`
- **Initial Password**: `ali12345`

### Mandatory Password Change
Upon first login, the portal identifies `mustChangePassword: true` and blocks normal administration until the administrator chooses a new, strong password.

### Serverless Session Architecture (Vercel Production)
- **Stateless HMAC-SHA256 Signed Tokens**: The application uses cryptographically signed session tokens instead of local disk writes. This guarantees seamless multi-instance compatibility across Vercel serverless cold starts.
- **Read-Only Filesystem Resilience**: The system safely detects serverless environments (`EROFS: read-only file system`) and avoids crashing HTTP 500 errors.

### Operator Password Reset & Recovery
The portal uses the standard `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` configuration:
- **Default Email**: `khapluali19@gmail.com` (configured via `INITIAL_ADMIN_EMAIL`)
- **Default Password**: `ali12345` (configured via `INITIAL_ADMIN_PASSWORD`)

#### Updating Credentials on Vercel
To change the administrator password on Vercel:
1. Open **Vercel Dashboard** > **triple-e-org** > **Settings** > **Environment Variables**.
2. Set or update:
   - `INITIAL_ADMIN_EMAIL` = `khapluali19@gmail.com`
   - `INITIAL_ADMIN_PASSWORD` = `[Your Desired Password]`
3. Ensure no deprecated `ADMIN_PASSWORD_HASH` variable is set.
4. Redeploy the project. Vercel serverless will immediately accept the new password.

#### Local Reset Tool
You can also run the built-in reset script:
```powershell
npm run reset-admin -- "YourNewPassword123"
```
This updates local files and outputs the environment variables.

---

## 6. Managing Multi-Category Google Sheets

Navigate to **Admin Dashboard** > **Google Sheets Manager** (`/admin/sheets`):

1. **Three Independent Categories**:
   - **Lower Class Category** (Primary Tier)
   - **Middle Class Category** (Junior Secondary Tier)
   - **Overall Category** (Open Academic Championship)
2. **Attaching a Sheet**:
   - Paste the Google Spreadsheet URL (e.g., `https://docs.google.com/spreadsheets/d/1BxiMVs0.../edit`).
   - The system automatically extracts the spreadsheet ID.
   - Enter the **Worksheet Tab Name** (e.g., `Results`, `LowerClass`, `OverallTrack`).
   - Specify the **Header Row Index** (typically `1`).
   - Click **Test Connection**: The server validates access with the Service Account and fetches live column headers and a 3-row sample preview.
   - Verify Column Mappings:
     - Roll Number Column (Required)
     - Student Name Column (Required)
     - Obtained Marks Column (Required)
     - Total Marks, School, Class, Percentage, Rank (Optional)
   - Click **Save Connection Settings**.
3. **Disconnecting a Sheet**:
   - Click **Disconnect Sheet**. A confirmation modal requires you to type `DISCONNECT`.
   - When disconnected, the public lookup gracefully informs students that the ledger is undergoing maintenance without throwing exceptions or leaking system details.

---

## 7. Branding, Ribbons & Siachen Mark Attribution

Navigate to **Admin Dashboard** > **Website Branding** (`/admin/branding`):

1. **Competition Identity**:
   - Organization name, headline, competition edition, and description.
2. **Announcement Ribbon**:
   - Toggle visibility and set custom ticker text.
3. **Public Scorecard Visibility**:
   - Toggle optional student fields (e.g. show/hide father name, section, rank, grade, subject breakdown).
4. **Siachen Mark Partner Attribution (Very Bottom)**:
   - **Authentic Logo Asset**: Preserves 1:1 aspect ratio without stretching (`/images/logos/siachen-mark-logo.jpg`).
   - **Default Headline**: `"Designed & Developed by Siachen Mark Agency"`
   - **City**: `"Islamabad"`
   - **Leadership Credit**: `"Basharat Ali | Former Social Media Head, Triple E Organization"`
   - **Target Link**: `https://siachen-mark.vercel.app/` (opens in new tab with `target="_blank" rel="noopener noreferrer"`).
   - Editable in admin panel if titles or leadership credits change.

---

## 8. Deployment Instructions

### Option A: Vercel Deployment (Recommended)
1. Push the repository to GitHub / GitLab (private repository recommended).
2. Import the repository in [Vercel](https://vercel.com).
3. Framework Preset: **Next.js**.
4. Configure Environment Variables in Vercel Project Settings:
   - `INITIAL_ADMIN_EMAIL`
   - `INITIAL_ADMIN_PASSWORD`
   - `ADMIN_ACCESS_SECRET`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (Paste the exact string including `\n` linebreaks)
   - `NEXT_PUBLIC_SITE_URL`
5. Click **Deploy**.

### Option B: Node.js Linux Server (Ubuntu/Debian with PM2 & Nginx)
1. Install Node.js 20+ and PM2:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```
2. Clone repository & install dependencies:
   ```bash
   git clone <repo-url> /var/www/triple-e-portal
   cd /var/www/triple-e-portal
   npm ci
   ```
3. Create `.env.local` with production values.
4. Build the application:
   ```bash
   npm run build
   ```
5. Run the automated test suite to verify server integrity:
   ```bash
   npm test
   ```
6. Start with PM2:
   ```bash
   pm2 start npm --name "triple-e-portal" -- start -- -p 3000
   pm2 save
   pm2 startup
   ```
7. Configure Nginx reverse proxy with SSL (Certbot) on port 443 pointing to `http://127.0.0.1:3000`.

---

## 9. Operational Troubleshooting & Runbook

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **HTTP 503 "Ledger Unavailable"** | Spreadsheet tab name misspelled or sheet disconnected in admin. | Go to `/admin/sheets`, select category, verify worksheet name, and click "Test Connection". |
| **HTTP 404 "Result Not Found"** | Candidate roll number not in the selected category tab, or student picked the wrong category. | Verify student chose the correct track (Lower vs Middle vs Overall). Confirm roll number in Google Sheet. |
| **HTTP 409 "Duplicate Records"** | Two rows in the Google Sheet have the exact same Roll Number. | Examination committee must correct the duplicate roll number in the master Google Sheet so each record is unique. |
| **Google Permission Denied (403)** | Google Sheet not shared with service account email. | Share the sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Viewer**. |
| **HTTP 429 "Too Many Requests"** | IP address exceeded rate limit (lookups or login attempts). | Wait 5 minutes for the rolling rate limit window to expire. |
| **Print scorecard cut off** | Custom browser margins overriding A4 CSS. | In the browser print dialog, set Margins to "Default" or "None". The portal has built-in 8mm A4 print margins. |

---

## 10. Maintenance, Backup & Security Rotation

1. **Backups**:
   - Regularly backup `src/data/` which contains:
     - `category-sheets-config.json`
     - `branding-config.json`
     - `admin-auth.json`
     - `admin-activity-log.json`
2. **Rotating Google Credentials**:
   - Generate a new key in Google Cloud Console.
   - Update `GOOGLE_PRIVATE_KEY` in `.env.local` or Vercel dashboard.
   - Test connections on `/admin/sheets`.
   - Delete the retired key in Google Cloud Console.
3. **Updating Packages**:
   - Periodically run `npm outdated` and apply security patches with `npm update`.
   - Always run `npm test` after updating dependencies to ensure no breaking changes occur.

---
*Official Publication by Triple E Organization & Siachen Mark Agency.*
