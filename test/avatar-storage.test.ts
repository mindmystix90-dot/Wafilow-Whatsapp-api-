import test from "node:test";
import assert from "node:assert/strict";
import {
  validateImageMagicBytes,
  MAX_AVATAR_SIZE,
  ALLOWED_MIME_TYPES,
  uploadAvatar,
  deleteAvatar,
  getAvatarFile,
  getStorageHealth,
} from "../lib/storage";

test("1. Avatar File Validation & Size Enforcement", async (t) => {
  await t.test("enforces 3MB maximum file limit", () => {
    assert.equal(MAX_AVATAR_SIZE, 3 * 1024 * 1024);
  });

  await t.test("allows only valid image MIME types", () => {
    assert.equal(ALLOWED_MIME_TYPES.has("image/jpeg"), true);
    assert.equal(ALLOWED_MIME_TYPES.has("image/png"), true);
    assert.equal(ALLOWED_MIME_TYPES.has("image/webp"), true);
    assert.equal(ALLOWED_MIME_TYPES.has("image/gif"), true);
    assert.equal(ALLOWED_MIME_TYPES.has("image/svg+xml"), false);
    assert.equal(ALLOWED_MIME_TYPES.has("application/pdf"), false);
    assert.equal(ALLOWED_MIME_TYPES.has("text/html"), false);
  });

  await t.test("rejects buffers larger than 3MB", async () => {
    const oversizedBuffer = Buffer.alloc(3 * 1024 * 1024 + 1);
    await assert.rejects(
      async () => {
        await uploadAvatar(oversizedBuffer, "test-user-1", "image/png");
      },
      {
        message: /exceeds the 3MB maximum allowed limit/,
      }
    );
  });
});

test("2. Magic Byte Signature Validation", async (t) => {
  await t.test("identifies valid PNG magic bytes", () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    assert.equal(validateImageMagicBytes(pngHeader), "png");
  });

  await t.test("identifies valid JPEG magic bytes", () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    assert.equal(validateImageMagicBytes(jpegHeader), "jpg");
  });

  await t.test("identifies valid GIF magic bytes", () => {
    const gifHeader = Buffer.from("GIF89a\x01\x00\x01\x00", "binary");
    assert.equal(validateImageMagicBytes(gifHeader), "gif");
  });

  await t.test("identifies valid WebP magic bytes", () => {
    const webpHeader = Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 ", "binary");
    assert.equal(validateImageMagicBytes(webpHeader), "webp");
  });

  await t.test("rejects executable or script masquerading as image", () => {
    const scriptBuffer = Buffer.from("<svg onload=alert(1)>", "utf8");
    assert.equal(validateImageMagicBytes(scriptBuffer), null);

    const htmlBuffer = Buffer.from("<!DOCTYPE html><html><body>Test</body></html>", "utf8");
    assert.equal(validateImageMagicBytes(htmlBuffer), null);

    const textBuffer = Buffer.from("Plain text file pretending to be image", "utf8");
    assert.equal(validateImageMagicBytes(textBuffer), null);
  });
});

test("3. User Isolation & Safe Deletion Enforcement", async (t) => {
  const pngSample = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);

  await t.test("upload generates user-isolated storage key", async () => {
    const res = await uploadAvatar(pngSample, "usr_alice123", "image/png");
    assert.match(res.url, /^\/api\/user\/avatar\/avatar_usr_alice123_\d+_[a-z0-9]+\.png$/);
    assert.match(res.storageKey, /avatar_usr_alice123_/);
  });

  await t.test("prevents User B from deleting User A's avatar", async () => {
    const userAUrl = "/api/user/avatar/avatar_usr_alice123_1700000000000_abc123.png";
    const deleteAttemptByBob = await deleteAvatar(userAUrl, "usr_bob999");
    assert.equal(deleteAttemptByBob, false);
  });

  await t.test("rejects path traversal in delete operations", async () => {
    const maliciousPath = "/api/user/avatar/../../etc/passwd";
    const res = await deleteAvatar(maliciousPath, "usr_alice123");
    assert.equal(res, false);
  });

  await t.test("rejects path traversal in getAvatarFile", async () => {
    const traversalFilename = "../../../etc/passwd";
    const res = await getAvatarFile(traversalFilename);
    assert.equal(res, null);
  });
});

test("4. Storage Health and Provider Reporting", async (t) => {
  await t.test("returns valid health status", () => {
    const health = getStorageHealth();
    assert.equal(typeof health.isPersistent, "boolean");
    assert.ok(health.provider === "gcs" || health.provider === "local_dev");
  });
});
