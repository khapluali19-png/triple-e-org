import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";
import { getWebsiteBranding, saveWebsiteBranding } from "@/lib/server/brandingStore";
import { logAdminActivity } from "@/lib/server/adminAuthStore";

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
      countdown: branding.countdown,
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
    const body = await request.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid 'enabled' boolean field." },
        { status: 400 }
      );
    }

    const current = getWebsiteBranding();
    const updatedCountdown = {
      ...(current.countdown || {}),
      ...(body.countdown || {}),
      enabled: body.enabled,
    };

    const updated = saveWebsiteBranding(
      {
        countdown: updatedCountdown,
        resultsPublished: !body.enabled,
      },
      auth.email || "Administrator"
    );

    // Revalidate Next.js router and data caches immediately
    try {
      revalidatePath("/");
      revalidatePath("/api/branding");
      revalidatePath("/admin");
    } catch (revalErr) {
      console.warn("[CountdownAPI] revalidatePath notice:", revalErr);
    }

    logAdminActivity(
      body.enabled ? "Countdown Turned ON" : "Countdown Turned OFF",
      auth.email || "Administrator",
      `Result Announcement Countdown switched to ${body.enabled ? "ON" : "OFF"}. Result searching is ${body.enabled ? "locked" : "active"}.`
    );

    const response = NextResponse.json(
      {
        success: true,
        message: `Result Announcement Countdown switched ${body.enabled ? "ON" : "OFF"} successfully.`,
        countdown: updated.countdown,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    // Delete any legacy countdown_enabled cookie to prevent split-brain client overrides
    response.cookies.delete("countdown_enabled");

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update countdown settings." },
      { status: 500 }
    );
  }
}
