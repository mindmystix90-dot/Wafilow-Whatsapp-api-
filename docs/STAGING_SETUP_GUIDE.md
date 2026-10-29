# Wafilow — Windows Staging Environment Setup Guide

This guide provides a secure, step-by-step walkthrough for configuring and running the **`wafilow-staging`** database verification on a Windows workstation using **Git**, **Node.js (v20+ LTS)**, and **npm**.

---

## 1. Prerequisites

Ensure you have the following installed on Windows:
1. **Node.js 20+ LTS**: Download and install from [nodejs.org](https://nodejs.org/) (ensure `npm` is included in your system `PATH`).
2. **Git for Windows**: Download and install from [git-scm.com](https://git-scm.com/).

To verify your local installation, open **PowerShell** or **Command Prompt** and run:
```powershell
node -v
npm -v
git --version
```

---

## 2. Clone the Repository

Clone your repository from GitHub and navigate to the project directory:
```powershell
git clone https://github.com/<your-org>/wafilow.git
cd wafilow
```

---

## 3. Install Dependencies Using Authoritative Lockfile

Run `npm ci` to install exact dependencies from `package-lock.json`:
```powershell
npm ci
```
*Note: This automatically triggers `prisma generate` and `node scripts/verify-next-bundle.js` via the `postinstall` hook, ensuring that all Next.js bundles and Prisma clients are verified.*

---

## 4. Securely Configure Staging `.env.local`

Create a local `.env.local` file in the root of the project directory.

### A. Create the file in PowerShell
```powershell
New-Item -Path .env.local -ItemType File -Force
```

### B. Add Configuration Template (Without Committing Secrets)
Open `.env.local` in Notepad or VS Code and add the following template:

```env
# Application Environment
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-development-secret-at-least-32-chars

# Neon PostgreSQL Staging Branch (wafilow-staging)
# Retrieve this from: Neon Console -> Your Project -> Branches -> "wafilow-staging" -> Connection Details
DATABASE_URL="postgresql://<username>:<password>@<ep-wafilow-staging-endpoint>.aws.neon.tech/neondb?sslmode=require"
```

### C. Verify Git Ignored Status
Verify that `.env.local` is never tracked or staged by Git:
```powershell
git status --ignored
```
You should see `.env.local` listed under **Ignored files**.
Alternatively, check with:
```powershell
git check-ignore -v .env.local
```
Expected output:
```text
.gitignore:34:.env*    .env.local
```

> **Security Rule:** Never commit `.env.local` or push it to GitHub. It is exclusively for your local workspace.

---

## 5. Execute the Read-Only Staging Inspection

Before applying any migrations or writes, run the project's dedicated read-only staging verification script:

```powershell
npx tsx scripts/inspect-staging.ts
```

### What this script verifies:
1. **Branch Identity:** Checks `current_setting('neon.branch_name')` to guarantee you are connected to `wafilow-staging` (and **not** production). If the branch name does not match `wafilow-staging`, it halts immediately.
2. **Schema Audit:** Inspects all tables, columns, data types, constraints, and indexes in the `public` schema.
3. **Migration History:** Inspects `_prisma_migrations` to verify which migrations have been applied.
4. **Data Isolation:** Verifies row counts across all tables to confirm the branch is schema-only.
5. **Credential Safety:** The script masks connection passwords and tokens in all output logs.

---

## 6. Run Local Development Server

Once staging verification succeeds, start your local Next.js development server:
```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
- Landing Page: `http://localhost:3000/`
- Customer Login: `http://localhost:3000/login`
- Super Admin Login: `http://localhost:3000/admin/login`
- Customer Signup: `http://localhost:3000/signup`

---

## 7. Troubleshooting

- **`DATABASE_URL is not configured in the environment`**:
  Ensure `.env.local` is in the root directory and contains `DATABASE_URL=...`.
- **`Branch mismatch error`**:
  Ensure the connection string endpoint in `.env.local` corresponds to the `wafilow-staging` branch in the Neon Console, not `main` or `production`.
