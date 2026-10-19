import { NextResponse } from "next/server";
import { getWebsiteBranding } from "@/lib/server/brandingStore";

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  const branding = getWebsiteBranding();

  return NextResponse.json({
    success: true,
    branding,
  });
}
