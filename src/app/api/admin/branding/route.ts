import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";
import { getWebsiteBranding, saveWebsiteBranding } from "@/lib/server/brandingStore";
import { WebsiteBrandingConfig } from "@/lib/types";

export async function GET(request: NextRequest) {
  const auth = verifyAdminAuthorization(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.reason || "Unauthorized" },
      { status: 401 }
    );
  }

  const branding = getWebsiteBranding();
  return NextResponse.json({
    success: true,
    branding,
  });
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminAuthorization(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.reason || "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const updates = (await request.json()) as Partial<WebsiteBrandingConfig>;
    const updated = saveWebsiteBranding(updates, auth.email || "Administrator");

    return NextResponse.json({
      success: true,
      message: "Website branding settings saved successfully.",
      branding: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to save branding settings." },
      { status: 400 }
    );
  }
}
