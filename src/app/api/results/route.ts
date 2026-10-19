import { NextRequest, NextResponse } from "next/server";
import { CategoryId } from "@/lib/types";
import { 
  checkRateLimit, 
  lookupStudentResultFromSheet, 
  normalizeRollNumber 
} from "@/lib/server/googleSheetsService";

export async function GET(request: NextRequest) {
  // 1. Rate Limiting Check (30 requests/minute per IP)
  const clientIp = 
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        code: "RATE_LIMITED",
        message: `Too many lookup requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateCheck.retryAfterSeconds || 30),
        },
      }
    );
  }

  // 2. Query Parameters Extraction & Normalization
  const { searchParams } = new URL(request.url);
  const rawRoll = searchParams.get("rollNumber");
  const rawCategory = searchParams.get("category");

  // Validate missing roll number
  if (!rawRoll || !rawRoll.trim()) {
    return NextResponse.json(
      {
        success: false,
        code: "MISSING_ROLL_NUMBER",
        message: "Please enter your designated Roll Number to verify your result.",
      },
      { status: 400 }
    );
  }

  // Validate invalid category if supplied
  if (rawCategory && !["lower", "middle", "overall", "all"].includes(rawCategory.toLowerCase())) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_CATEGORY",
        message: "Invalid competition category. Please select Lower Class, Middle Class, or Overall.",
      },
      { status: 400 }
    );
  }

  // Strictly preserve leading zeros and formatting
  const rollNumber = normalizeRollNumber(rawRoll);
  const category = (rawCategory?.toLowerCase() || "all") as CategoryId | "all";

  // 3. Category Evaluation
  const categoriesToCheck: CategoryId[] = 
    category && category !== "all" 
      ? [category] 
      : ["lower", "middle", "overall"];

  let lastNotFoundMsg = `No verified record found for Roll Number "${rollNumber}".`;
  let sheetErrorMsg: string | null = null;

  for (const cat of categoriesToCheck) {
    const outcome = await lookupStudentResultFromSheet(cat, rollNumber);

    // Duplicate roll number detected within category ledger -> 409 Conflict
    if (outcome.code === "DUPLICATE_ROLL") {
      return NextResponse.json(
        {
          success: false,
          duplicateDetected: true,
          code: "DUPLICATE_ROLL",
          message: outcome.message,
        },
        { status: 409 }
      );
    }

    // Success -> Return strictly matching student's approved fields
    if (outcome.success && outcome.result) {
      return NextResponse.json(
        {
          success: true,
          result: outcome.result,
        },
        {
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
          },
        }
      );
    }

    // Sheet misconfiguration or disconnected sheet error
    if (outcome.code === "SHEET_ERROR") {
      sheetErrorMsg = outcome.message || "Examination sheet ledger is currently unavailable.";
    }

    if (outcome.message && outcome.code === "NOT_FOUND") {
      lastNotFoundMsg = outcome.message;
    }
  }

  // If the specific requested category had a sheet configuration/connection error, report 503
  if (category !== "all" && sheetErrorMsg) {
    return NextResponse.json(
      {
        success: false,
        code: "SHEET_UNAVAILABLE",
        message: sheetErrorMsg,
      },
      { status: 503 }
    );
  }

  // Result not found
  return NextResponse.json(
    {
      success: false,
      code: "NOT_FOUND",
      message: lastNotFoundMsg,
    },
    { status: 404 }
  );
}
