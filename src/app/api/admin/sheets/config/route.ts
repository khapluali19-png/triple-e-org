import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";
import { getServerCategoryStore, updateCategoryConnection } from "@/lib/server/configStore";
import { CategoryId, CategorySheetConnection } from "@/lib/types";
import { invalidateSheetCache } from "@/lib/server/googleSheetsService";

export async function GET(request: NextRequest) {
  const auth = verifyAdminAuthorization(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.reason || "Unauthorized" },
      { status: 401 }
    );
  }

  const store = getServerCategoryStore();
  return NextResponse.json({
    success: true,
    store,
  });
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminAuthorization(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.reason || "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { categoryId, connection } = body as {
      categoryId: CategoryId;
      connection: Partial<CategorySheetConnection>;
    };

    if (!categoryId || !connection) {
      return NextResponse.json(
        { success: false, message: "Missing categoryId or connection payload." },
        { status: 400 }
      );
    }

    const updated = updateCategoryConnection(categoryId, {
      ...connection,
      lastSyncedAt: new Date().toISOString(),
      status: connection.status || "connected",
    });

    // Invalidate in-memory cache so subsequent lookups immediately use updated sheet
    invalidateSheetCache(categoryId);

    return NextResponse.json({
      success: true,
      message: `Configuration for "${updated.categoryTitle}" saved successfully.`,
      connection: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update configuration." },
      { status: 500 }
    );
  }
}
