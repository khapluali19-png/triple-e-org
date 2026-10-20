import { NextRequest, NextResponse } from "next/server";
import { changeAdminPassword, createAdminSessionToken } from "@/lib/server/adminAuthStore";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const sessionToken = request.cookies.get("admin_session")?.value || bearerToken;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body || {};

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Current password and new password are required." },
        { status: 400 }
      );
    }

    const result = await changeAdminPassword(currentPassword, newPassword, sessionToken);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      persisted: result.persisted ?? true,
      message: result.message,
      passwordHash: result.passwordHash,
      persistenceWarning: result.persistenceWarning,
    });

    // Refresh the cookie session
    if (sessionToken && !sessionToken.startsWith("triple-e-")) {
      const email = request.cookies.get("admin_session") ? "khapluali19@gmail.com" : undefined;
      if (email) {
        const freshToken = createAdminSessionToken(email);
        response.cookies.set({
          name: "admin_session",
          value: freshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      }
    }

    return response;
  } catch (err: any) {
    console.error("[ChangePassword API] Error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to change password." },
      { status: 500 }
    );
  }
}
