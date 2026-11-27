import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { verifyMetaSignature } from "../app/api/webhook/route";

test("Meta WhatsApp Webhook Security Suite", async (t) => {
  const secret = "test_meta_app_secret_123456789";
  const payload = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "waba_123", changes: [] }],
  });

  await t.test("1. Valid HMAC-SHA256 signature is accepted", async () => {
    const validHmac = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const signatureHeader = `sha256=${validHmac}`;

    const isValid = verifyMetaSignature(payload, signatureHeader, secret);
    assert.equal(isValid, true, "Signature generated with matching app secret must be valid");
  });

  await t.test("2. Forged or tampered HMAC-SHA256 signature is rejected", async () => {
    const forgedSignature = "sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const isValid = verifyMetaSignature(payload, forgedSignature, secret);
    assert.equal(isValid, false, "Forged signature must be rejected");
  });

  await t.test("3. Missing or malformed signature header is rejected when app secret configured", async () => {
    assert.equal(verifyMetaSignature(payload, null, secret), false, "Null header must be rejected");
    assert.equal(verifyMetaSignature(payload, "", secret), false, "Empty header must be rejected");
    assert.equal(verifyMetaSignature(payload, "invalid_prefix", secret), false, "Missing sha256= prefix must be rejected");
  });

  await t.test("4. Tampered payload with valid signature for original payload is rejected", async () => {
    const originalHmac = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const tamperedPayload = payload + " "; // Single trailing byte modification

    const isValid = verifyMetaSignature(tamperedPayload, `sha256=${originalHmac}`, secret);
    assert.equal(isValid, false, "Tampered payload must fail verification");
  });

  await t.test("5. Pass-through when META_APP_SECRET is not configured (dev mode)", async () => {
    assert.equal(
      verifyMetaSignature(payload, null, undefined, "development"),
      true,
      "Should pass through when no secret is configured in development"
    );
    assert.equal(
      verifyMetaSignature(payload, null, "", "test"),
      true,
      "Should pass through when secret is empty string in non-production"
    );
  });

  await t.test("6. Fails closed in production when META_APP_SECRET is missing or blank", async () => {
    const validHmac = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    assert.equal(
      verifyMetaSignature(payload, null, undefined, "production"),
      false,
      "Production must reject webhook when META_APP_SECRET is undefined"
    );
    assert.equal(
      verifyMetaSignature(payload, `sha256=${validHmac}`, "", "production"),
      false,
      "Production must reject webhook when META_APP_SECRET is empty"
    );
    assert.equal(
      verifyMetaSignature(payload, `sha256=${validHmac}`, "   ", "production"),
      false,
      "Production must reject webhook when META_APP_SECRET is whitespace"
    );

    // Also verify default process.env.NODE_ENV lookup
    const prevNodeEnv = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      assert.equal(
        verifyMetaSignature(payload, null, undefined),
        false,
        "Default NODE_ENV=production must fail closed without secret"
      );
      assert.equal(
        verifyMetaSignature(payload, `sha256=${validHmac}`, secret),
        true,
        "Default NODE_ENV=production must still accept valid HMAC signature when secret is configured"
      );
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
    }
  });
});
