import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  uploadAvatar,
  deleteAvatar,
  ALLOWED_MIME_TYPES,
  MAX_AVATAR_SIZE,
  getStorageHealth,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/avatar
 * Returns storage configuration health and active provider status
 */
export async function GET() {
  const health = getStorageHealth();
  return NextResponse.json({
    success: true,
    storage: health,
  });
}

/**
 * POST /api/user/avatar
 * Uploads, validates, and stores a Wafilow profile photo in persistent object storage.
 * Strictly associated with the authenticated user only.
 * Never connects to Meta or WhatsApp Business APIs.
 */
export async function POST(req: NextRequest) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      session = null;
    }
    const userId = session?.user?.id;

    if (!session || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to update your profile photo." },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let declaredMimeType: string = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") || formData.get("avatar");

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { success: false, error: "No image file provided in form data." },
          { status: 400 }
        );
      }

      if (file.size > MAX_AVATAR_SIZE) {
        return NextResponse.json(
          { success: false, error: "Image file is too large. Maximum allowed size is 3MB." },
          { status: 400 }
        );
      }

      declaredMimeType = file.type.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      const dataUrl: string | undefined = body.dataUrl || body.image;

      if (!dataUrl || typeof dataUrl !== "string") {
        return NextResponse.json(
          { success: false, error: "No image data URL provided." },
          { status: 400 }
        );
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { success: false, error: "Invalid image data format. Base64 data URI expected." },
          { status: 400 }
        );
      }

      declaredMimeType = match[1].toLowerCase();
      fileBuffer = Buffer.from(match[2], "base64");

      if (fileBuffer.length > MAX_AVATAR_SIZE) {
        return NextResponse.json(
          { success: false, error: "Image data is too large. Maximum allowed size is 3MB." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported Content-Type. Multipart form-data or JSON base64 required." },
        { status: 400 }
      );
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "Uploaded file is empty." },
        { status: 400 }
      );
    }

    // 1. Validate MIME format
    if (!ALLOWED_MIME_TYPES.has(declaredMimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file format. Allowed formats: JPEG, PNG, WebP, GIF.",
        },
        { status: 400 }
      );
    }

    // 2. Fetch current user to track existing avatar for safe post-upload replacement
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    // 3. Upload to persistent object storage first (before modifying database or deleting previous avatar)
    const uploadResult = await uploadAvatar(fileBuffer, userId, declaredMimeType);

    // 4. Update User record in Neon PostgreSQL with stable persistent URL
    await prisma.user.update({
      where: { id: userId },
      data: { image: uploadResult.url },
    });

    // 5. Safely clean up previous avatar only after new upload succeeds
    if (currentUser?.image && currentUser.image !== uploadResult.url) {
      await deleteAvatar(currentUser.image, userId);
    }

    console.log(
      `[Wafilow Profile] Stored avatar via ${uploadResult.provider} for user ${userId} -> ${uploadResult.url}`
    );

    return NextResponse.json({
      success: true,
      avatarUrl: uploadResult.url,
      provider: uploadResult.provider,
      message: "Profile photo uploaded and updated successfully.",
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal error";
    console.error("[Avatar Upload Error]:", error);
    return NextResponse.json(
      { success: false, error: `Failed to upload profile photo: ${errorMsg}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/avatar
 * Removes the authenticated user's Wafilow profile photo.
 */
export async function DELETE() {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      session = null;
    }
    const userId = session?.user?.id;

    if (!session || !userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (currentUser?.image) {
      await deleteAvatar(currentUser.image, userId);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { image: null },
    });

    return NextResponse.json({
      success: true,
      message: "Profile photo removed successfully.",
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, error: `Failed to remove profile photo: ${errorMsg}` },
      { status: 500 }
    );
  }
}
