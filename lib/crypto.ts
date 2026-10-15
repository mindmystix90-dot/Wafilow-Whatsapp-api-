import crypto from "crypto";

/**
 * Enterprise AES-256-GCM Token Encryption at Rest
 * Secures customer WhatsApp Cloud API tokens in Neon PostgreSQL.
 * Backward compatible: gracefully handles legacy unencrypted tokens.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit recommended for GCM
const PREFIX = "enc:v1:";

function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "wafilow-saas-enterprise-token-encryption-key-2026";
  // Create deterministic 32-byte (256-bit) key using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts an access token string using AES-256-GCM
 */
export function encryptToken(plainText?: string | null): string | null {
  if (!plainText || typeof plainText !== "string" || !plainText.trim()) {
    return null;
  }

  // If already encrypted, return as is
  if (plainText.startsWith(PREFIX)) {
    return plainText;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText.trim(), "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return `${PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("[Token Encryption Error]:", err);
    // Return original if encryption fails rather than crashing, but log safely
    return plainText;
  }
}

/**
 * Decrypts an encrypted access token using AES-256-GCM.
 * Seamlessly handles legacy plain tokens for zero-downtime migration.
 */
export function decryptToken(encryptedText?: string | null): string {
  if (!encryptedText || typeof encryptedText !== "string") {
    return "";
  }

  // Legacy or unencrypted token support
  if (!encryptedText.startsWith(PREFIX)) {
    return encryptedText.trim();
  }

  try {
    const parts = encryptedText.slice(PREFIX.length).split(":");
    if (parts.length !== 3) {
      console.warn("[Token Decryption] Invalid token format; fallback to raw");
      return encryptedText;
    }

    const [ivHex, authTagHex, cipherHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("[Token Decryption Exception]:", err);
    return "";
  }
}
