import { NextRequest, NextResponse } from "next/server";
import { getWebsiteBranding } from "@/lib/server/brandingStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const cookieVal = request.cookies.get("countdown_enabled")?.value;
  const branding = getWebsiteBranding(cookieVal ? cookieVal === "true" : undefined);

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
