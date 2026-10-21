import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";
import { getWebsiteBranding, saveWebsiteBranding } from "@/lib/server/brandingStore";
import { WebsiteBrandingConfig } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = verifyAdminAuthorization(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.reason || "Unauthorized" },
      { 
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }

  const branding = getWebsiteBranding();
  return NextResponse.json(
    {
      success: true,
      branding,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminAuthorization(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.reason || "Unauthorized" },
      { 
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }

  try {
    const updates = (await request.json()) as Partial<WebsiteBrandingConfig>;
    const updated = saveWebsiteBranding(updates, auth.email || "Administrator");

    // Invalidate Next.js cache
    try {
      revalidatePath("/");
      revalidatePath("/api/branding");
      revalidatePath("/admin");
    } catch (revalErr) {
      console.warn("[AdminBrandingAPI] revalidatePath notice:", revalErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Website branding settings saved successfully.",
        branding: updated,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to save branding settings." },
      { status: 400 }
    );
  }
}
