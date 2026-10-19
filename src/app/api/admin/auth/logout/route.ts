import { NextRequest, NextResponse } from "next/server";
import { invalidateAdminSession } from "@/lib/server/adminAuthStore";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("admin_session")?.value;
  if (sessionToken) {
    invalidateAdminSession(sessionToken);
  }

  const response = NextResponse.json({
    success: true,
    message: "Administrator session terminated.",
  });

  // Clear cookie
  response.cookies.delete("admin_session");
  return response;
}
