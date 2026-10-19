import { NextRequest, NextResponse } from "next/server";
import { changeAdminPassword } from "@/lib/server/adminAuthStore";

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
    const { currentPassword, newPassword } = body;

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

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to change password." },
      { status: 500 }
    );
  }
}
