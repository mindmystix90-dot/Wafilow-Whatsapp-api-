import { Storage } from "@google-cloud/storage";
import fs from "fs/promises";
import path from "path";

export interface StorageUploadResult {
  url: string;
  storageKey: string;
  provider: "gcs" | "local_dev";
}

export interface StorageGetResult {
  buffer: Buffer;
  contentType: string;
}

export const MAX_AVATAR_SIZE = 3 * 1024 * 1024; // 3MB

export const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Validates file magic bytes to prevent spoofed MIME types
 */
export function validateImageMagicBytes(buffer: Buffer): string | null {
  if (buffer.length < 8) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  // GIF: GIF87a or GIF89a (47 49 46 38 37 61 or 47 49 46 38 39 61)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "gif";
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

/**
 * Resolves Google Cloud Storage client and bucket configuration
 */
let gcsClient: Storage | null = null;

function getGcsClient(): { client: Storage; bucketName: string } | null {
  const bucketName = process.env.GCS_BUCKET_NAME || process.env.STORAGE_BUCKET;
  if (!bucketName || bucketName.trim() === "") {
    return null;
  }

  if (!gcsClient) {
    const projectId = process.env.GCS_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    const clientEmail = process.env.GCS_CLIENT_EMAIL;
    const privateKey = process.env.GCS_PRIVATE_KEY
      ? process.env.GCS_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    if (clientEmail && privateKey) {
      gcsClient = new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      });
    } else {
      // Standard Application Default Credentials (ADC) or GCP Metadata server
      gcsClient = new Storage({
        projectId,
      });
    }
  }

  return { client: gcsClient, bucketName: bucketName.trim() };
}

/**
 * Returns storage configuration health and active provider
 */
export function getStorageHealth(): {
  provider: "gcs" | "local_dev";
  isPersistent: boolean;
  bucketName: string | null;
} {
  const gcs = getGcsClient();
  if (gcs) {
    return {
      provider: "gcs",
      isPersistent: true,
      bucketName: gcs.bucketName,
    };
  }
  return {
    provider: "local_dev",
    isPersistent: false,
    bucketName: null,
  };
}

/**
 * Uploads an avatar buffer to persistent object storage (Google Cloud Storage)
 * with graceful local fallback if GCS is not yet configured.
 */
export async function uploadAvatar(
  buffer: Buffer,
  userId: string,
  declaredMimeType: string
): Promise<StorageUploadResult> {
  if (buffer.length > MAX_AVATAR_SIZE) {
    throw new Error("Image file exceeds the 3MB maximum allowed limit.");
  }

  const detectedExt = validateImageMagicBytes(buffer);
  if (!detectedExt) {
    throw new Error("The uploaded file does not contain valid image data.");
  }

  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const filename = `avatar_${sanitizedUserId}_${timestamp}_${randomSuffix}.${detectedExt}`;
  const storageKey = `avatars/${filename}`;

  const gcs = getGcsClient();

  if (gcs) {
    // 1. Upload to Google Cloud Storage
    const bucket = gcs.client.bucket(gcs.bucketName);
    const file = bucket.file(storageKey);

    await file.save(buffer, {
      contentType: declaredMimeType,
      metadata: {
        userId: sanitizedUserId,
        uploadedAt: new Date().toISOString(),
      },
      resumable: false,
    });

    // Provide the stable API route URL so images are served consistently
    const publicBase = process.env.GCS_PUBLIC_URL?.replace(/\/$/, "");
    const url = publicBase
      ? `${publicBase}/${storageKey}`
      : `/api/user/avatar/${filename}`;

    return {
      url,
      storageKey,
      provider: "gcs",
    };
  }

  // 2. Local dev storage fallback (if GCS bucket is not yet configured)
  const localDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await fs.mkdir(localDir, { recursive: true });
  const localPath = path.join(localDir, filename);
  await fs.writeFile(localPath, buffer);

  console.warn(
    "[Wafilow Storage] GCS_BUCKET_NAME is not configured. Saved to local dev storage: " +
      localPath
  );

  return {
    url: `/api/user/avatar/${filename}`,
    storageKey: filename,
    provider: "local_dev",
  };
}

/**
 * Retrieves avatar bytes from persistent object storage (or legacy local disk)
 */
export async function getAvatarFile(filename: string): Promise<StorageGetResult | null> {
  const safeFilename = path.basename(filename);
  if (!safeFilename.startsWith("avatar_") || safeFilename.includes("..")) {
    return null;
  }

  const ext = path.extname(safeFilename).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  // 1. Check Google Cloud Storage if configured
  const gcs = getGcsClient();
  if (gcs) {
    try {
      const bucket = gcs.client.bucket(gcs.bucketName);
      const file = bucket.file(`avatars/${safeFilename}`);
      const [exists] = await file.exists();
      if (exists) {
        const [buffer] = await file.download();
        return { buffer, contentType };
      }
    } catch (err) {
      console.warn("[Wafilow Storage] Error checking GCS object:", err);
    }
  }

  // 2. Check local disk (for legacy avatars or dev mode)
  try {
    const localPath = path.join(process.cwd(), "public", "uploads", "avatars", safeFilename);
    const localBuffer = await fs.readFile(localPath);
    return { buffer: localBuffer, contentType };
  } catch {
    return null;
  }
}

/**
 * Safely deletes an avatar from object storage (and local disk)
 * Verifies that the file belongs strictly to the requested user.
 */
export async function deleteAvatar(
  imageUrlOrKey: string | null | undefined,
  userId: string
): Promise<boolean> {
  if (!imageUrlOrKey || !userId) return false;

  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safePrefix = `avatar_${sanitizedUserId}_`;

  const filename = path.basename(imageUrlOrKey);
  if (!filename.startsWith(safePrefix)) {
    // Ownership check: this avatar file does not belong to the user
    return false;
  }

  let deleted = false;

  // 1. Delete from Google Cloud Storage if configured
  const gcs = getGcsClient();
  if (gcs) {
    try {
      const bucket = gcs.client.bucket(gcs.bucketName);
      const file = bucket.file(`avatars/${filename}`);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        deleted = true;
      }
    } catch (err) {
      console.warn("[Wafilow Storage] Error deleting from GCS:", err);
    }
  }

  // 2. Delete from local disk (if it was a local file)
  try {
    const localPath = path.join(process.cwd(), "public", "uploads", "avatars", filename);
    await fs.unlink(localPath).catch(() => {});
    deleted = true;
  } catch {
    // Non-critical
  }

  return deleted;
}
