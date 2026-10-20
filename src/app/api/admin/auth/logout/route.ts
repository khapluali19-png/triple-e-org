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

  // Explicitly clear the cookie across all browser variants
  response.cookies.set({
    name: "admin_session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
