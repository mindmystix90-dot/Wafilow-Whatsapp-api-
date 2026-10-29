/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const EXPECTED_DIGESTS = {
  react: "21e2fab0de8055f996690b32036133a439f5dc748fcd9d490e2ecb164068b0e753df43f5125487e3fa739ca25ff0212a556b3317d3c27e56a3adcc6c5a8cac9b",
  worker: "c3ecdf960c3ffdcb72216aab8422ccb9879cd2b368402280d990bd77b6af634549a7997c87966448ca77c484a881d24a63dd91214e8d96e8f4af21066815e81b"
};

function getSha512(buf) {
  return crypto.createHash("sha512").update(buf).digest("hex");
}

function atomicSyncFile(srcBuf, expectedHash, targets) {
  let changed = false;

  for (const target of targets) {
    let needsUpdate = false;
    if (!fs.existsSync(target)) {
      needsUpdate = true;
    } else {
      const targetBuf = fs.readFileSync(target);
      if (!srcBuf.equals(targetBuf)) {
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const targetDir = path.dirname(target);
      const tmpFile = path.join(
        targetDir,
        `.tmp-sync-${path.basename(target)}-${process.pid}-${Date.now()}`
      );

      try {
        fs.mkdirSync(targetDir, { recursive: true });
        // 1. Write to unique temporary file
        fs.writeFileSync(tmpFile, srcBuf);

        // 2. Verify temporary file hash before replacing target
        const writtenBuf = fs.readFileSync(tmpFile);
        const writtenHash = getSha512(writtenBuf);
        if (writtenHash !== expectedHash) {
          throw new Error(`Temporary file hash mismatch for ${tmpFile}`);
        }

        // 3. Atomically rename temporary file over target
        fs.renameSync(tmpFile, target);
        console.log(`[verify-next-bundle] Atomically restored canonical: ${target}`);
        changed = true;
      } catch (err) {
        // Clean up temporary file on failure
        if (fs.existsSync(tmpFile)) {
          try {
            fs.unlinkSync(tmpFile);
          } catch {
            // ignore unlink errors
          }
        }
        // If the path is not writable (e.g. read-only bun cache in some containers), skip gracefully
      }
    }
  }
  return changed;
}

function verifyAndRepair() {
  const canonicalDir = path.join(__dirname, "canonical");
  const canonicalReactPath = path.join(canonicalDir, "react.development.js");
  const canonicalWorkerPath = path.join(canonicalDir, "worker.js");

  // Step 1: Pre-flight validation of canonical assets BEFORE touching any target
  if (!fs.existsSync(canonicalReactPath)) {
    console.error(`[verify-next-bundle] Missing canonical React file: ${canonicalReactPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(canonicalWorkerPath)) {
    console.error(`[verify-next-bundle] Missing canonical worker file: ${canonicalWorkerPath}`);
    process.exit(1);
  }

  const reactBuf = fs.readFileSync(canonicalReactPath);
  const reactHash = getSha512(reactBuf);
  if (reactHash !== EXPECTED_DIGESTS.react) {
    console.error(
      `[verify-next-bundle] Cryptographic verification failed for canonical React. Expected ${EXPECTED_DIGESTS.react}, got ${reactHash}`
    );
    process.exit(1);
  }

  const workerBuf = fs.readFileSync(canonicalWorkerPath);
  const workerHash = getSha512(workerBuf);
  if (workerHash !== EXPECTED_DIGESTS.worker) {
    console.error(
      `[verify-next-bundle] Cryptographic verification failed for canonical Worker. Expected ${EXPECTED_DIGESTS.worker}, got ${workerHash}`
    );
    process.exit(1);
  }

  // Step 2: Target paths
  const reactTargets = [
    path.join(__dirname, "../node_modules/next/dist/compiled/react/cjs/react.development.js"),
    "/root/.bun/install/cache/next@16.4.1@@@1/dist/compiled/react/cjs/react.development.js"
  ];

  const workerTargets = [
    path.join(__dirname, "../node_modules/next/dist/export/worker.js"),
    "/root/.bun/install/cache/next@16.4.1@@@1/dist/export/worker.js"
  ];

  // Step 3: Atomic synchronization with verification
  let repaired = false;
  if (atomicSyncFile(reactBuf, EXPECTED_DIGESTS.react, reactTargets)) repaired = true;
  if (atomicSyncFile(workerBuf, EXPECTED_DIGESTS.worker, workerTargets)) repaired = true;

  // Step 4: Clean stale .next build cache only if a file was repaired
  if (repaired) {
    const nextDir = path.join(__dirname, "../.next");
    if (fs.existsSync(nextDir)) {
      try {
        fs.rmSync(nextDir, { recursive: true, force: true });
        console.log("[verify-next-bundle] Purged stale .next cache");
      } catch {
        // ignore
      }
    }
  }
}

verifyAndRepair();
