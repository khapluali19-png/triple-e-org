import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";
import { getSheetPreview } from "@/lib/server/googleSheetsService";

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
    const { spreadsheetUrl, worksheetName, headerRowIndex } = body;

    if (!spreadsheetUrl) {
      return NextResponse.json(
        { success: false, message: "Please provide a Google Spreadsheet URL or ID." },
        { status: 400 }
      );
    }

    const preview = await getSheetPreview(
      spreadsheetUrl,
      worksheetName || "",
      Number(headerRowIndex) || 1
    );

    return NextResponse.json({
      success: true,
      message: "Connection verified! Spreadsheet metadata and column headers loaded successfully.",
      preview,
    });
  } catch (err: any) {
    let suggestedAction = "Verify that the spreadsheet URL is correct.";
    const errMsg = err.message || "";

    if (errMsg.includes("403") || errMsg.includes("Access denied")) {
      suggestedAction =
        "Ensure the Google Sheet is shared with the Triple E Service Account email as 'Viewer'.";
    } else if (errMsg.includes("not found") || errMsg.includes("404")) {
      suggestedAction =
        "Check that the spreadsheet ID is valid and that the worksheet tab name exists.";
    }

    return NextResponse.json(
      {
        success: false,
        message: errMsg || "Failed to test spreadsheet connection.",
        errorDetails: {
          reason: errMsg,
          suggestedAction,
        },
      },
      { status: 400 }
    );
  }
}
