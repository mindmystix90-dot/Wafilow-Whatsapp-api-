import { NextRequest, NextResponse } from "next/server";
import { getAvatarFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/avatar/[filename]
 * Streams an avatar image safely from persistent object storage (or legacy local disk)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    const file = await getAvatarFile(filename);

    if (!file) {
      return new NextResponse("Image not found", { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch {
    return new NextResponse("Error reading image", { status: 500 });
  }
}
