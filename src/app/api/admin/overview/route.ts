import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";
import { getServerCategoryStore } from "@/lib/server/configStore";
import { getAdminActivities } from "@/lib/server/adminAuthStore";
import { getWebsiteBranding } from "@/lib/server/brandingStore";

export async function GET(request: NextRequest) {
  const auth = verifyAdminAuthorization(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.reason || "Unauthorized" },
      { status: 401 }
    );
  }

  const store = getServerCategoryStore();
  const branding = getWebsiteBranding();
  const activities = getAdminActivities();

  const categories = Object.values(store.categories);
  const connectedCount = categories.filter((c) => c.status === "connected" && !!c.spreadsheetId).length;

  const categoryHealth = categories.map((c) => ({
    id: c.categoryId,
    title: c.categoryTitle,
    status: c.status,
    hasSpreadsheetId: !!c.spreadsheetId,
    worksheetName: c.worksheetName,
    lastTestedAt: c.lastTestedAt,
    lastSyncedAt: c.lastSyncedAt,
    lastError: c.lastError,
    missingRollNumberMapping: !c.columnMappings?.rollNumber,
    missingNameMapping: !c.columnMappings?.studentName,
    missingMarksMapping: !c.columnMappings?.obtainedMarks,
  }));

  const missingWarnings: string[] = [];
  categories.forEach((c) => {
    if (!c.spreadsheetId) {
      missingWarnings.push(`${c.categoryTitle}: No Google Spreadsheet ID is configured.`);
    } else if (c.status !== "connected") {
      missingWarnings.push(`${c.categoryTitle}: Sheet connection has not been verified.`);
    } else if (!c.columnMappings?.rollNumber || !c.columnMappings?.studentName) {
      missingWarnings.push(`${c.categoryTitle}: Essential column mappings (Roll No / Name) are incomplete.`);
    }
  });

  if (!branding.primaryContactEmail) {
    missingWarnings.push("Website Branding: Official contact email is not configured.");
  }

  return NextResponse.json({
    success: true,
    overview: {
      connectedCategoriesCount: connectedCount,
      totalCategoriesCount: categories.length,
      categoryHealth,
      missingWarnings,
      serviceAccountConfigured: store.serviceAccountConfigured,
      serviceAccountEmail: store.serviceAccountEmail,
      recentActivities: activities.slice(0, 10),
      countdown: branding.countdown,
      brandingSummary: {
        competitionTitle: branding.competitionTitle,
        organizationName: branding.organizationName,
        resultsPublished: branding.resultsPublished,
      },
    },
  });
}
