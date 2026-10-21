import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";
import { 
  getServerCategoryStore, 
  updateCategoryConnection, 
  updateCenterConnection,
  updateAllCentersConnection
} from "@/lib/server/configStore";
import { CategoryId, CategorySheetConnection, CenterSheetConnection } from "@/lib/types";
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
    const { centerId, categoryId, connection, applyToAllCenters } = body as {
      centerId?: string;
      categoryId?: CategoryId;
      connection: Partial<CenterSheetConnection | CategorySheetConnection>;
      applyToAllCenters?: boolean;
    };

    if (applyToAllCenters && connection) {
      const allUpdated = updateAllCentersConnection({
        ...(connection as Partial<CenterSheetConnection>),
        lastSyncedAt: new Date().toISOString(),
        status: connection.status || "connected",
      });

      invalidateSheetCache();

      return NextResponse.json({
        success: true,
        message: "Configuration saved permanently and applied to all 15 examination centers successfully.",
        centers: allUpdated,
      });
    }

    if (centerId) {
      if (!connection) {
        return NextResponse.json(
          { success: false, message: "Missing connection payload for center." },
          { status: 400 }
        );
      }

      const updated = updateCenterConnection(centerId, {
        ...connection,
        lastSyncedAt: new Date().toISOString(),
        status: connection.status || "connected",
      });

      // Invalidate cache so lookups immediately reflect changes
      invalidateSheetCache();

      return NextResponse.json({
        success: true,
        message: `Configuration for "${updated.centerName || centerId}" examination center saved permanently.`,
        connection: updated,
      });
    }

    if (categoryId) {
      if (!connection) {
        return NextResponse.json(
          { success: false, message: "Missing connection payload for category." },
          { status: 400 }
        );
      }

      const updated = updateCategoryConnection(categoryId, {
        ...(connection as Partial<CategorySheetConnection>),
        lastSyncedAt: new Date().toISOString(),
        status: connection.status || "connected",
      });

      invalidateSheetCache(categoryId);

      return NextResponse.json({
        success: true,
        message: `Configuration for "${updated.categoryTitle}" saved permanently.`,
        connection: updated,
      });
    }

    return NextResponse.json(
      { success: false, message: "Missing centerId or categoryId in request payload." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update configuration." },
      { status: 500 }
    );
  }
}
