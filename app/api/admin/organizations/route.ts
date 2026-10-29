import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleAuthError } from "@/lib/admin-auth";
import { listOrganizations, createOrganization } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const plan = searchParams.get("plan") || undefined;

    const orgs = await listOrganizations({ search, status, plan });
    return NextResponse.json({ success: true, organizations: orgs, count: orgs.length });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();

    const body = await req.json().catch(() => ({}));
    const { name, planTier } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Organization name is required." }, { status: 400 });
    }

    const org = await createOrganization({ name: name.trim(), planTier }, admin);
    return NextResponse.json({ success: true, organization: org, message: "Organization created successfully." });
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}
