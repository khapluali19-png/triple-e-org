import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/server/adminAuthStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await authenticateAdmin(email, password, clientIp);

    if (!result.success || !result.sessionToken) {
      const isRateLimited = result.message?.includes("Too many failed login attempts");
      return NextResponse.json(
        { success: false, message: result.message },
        { status: isRateLimited ? 429 : 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: result.message,
      email: email.trim().toLowerCase(),
      mustChangePassword: result.mustChangePassword,
    });

    // Set secure HttpOnly cookie
    response.cookies.set({
      name: "admin_session",
      value: result.sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
