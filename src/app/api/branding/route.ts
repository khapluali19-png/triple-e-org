import { NextResponse } from "next/server";
import { getWebsiteBranding } from "@/lib/server/brandingStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const branding = getWebsiteBranding();

  return NextResponse.json({
    success: true,
    branding,
  });
}
