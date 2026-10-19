import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";

export async function GET(request: NextRequest) {
  const auth = verifyAdminAuthorization(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { authenticated: false, message: "No active administrator session." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    email: auth.email,
    mustChangePassword: !!auth.mustChangePassword,
  });
}
