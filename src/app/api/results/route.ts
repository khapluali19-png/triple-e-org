import { NextRequest, NextResponse } from "next/server";
import { CategoryId } from "@/lib/types";
import { 
  checkRateLimit, 
  lookupStudentResultFromSheet, 
  lookupStudentResultByCenter,
  normalizeRollNumber 
} from "@/lib/server/googleSheetsService";
import { findCenterByIdOrName } from "@/lib/constants";
import { getWebsiteBranding } from "@/lib/server/brandingStore";

export async function GET(request: NextRequest) {
  // 1. Rate Limiting Check (120 requests/minute per IP)
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

  // 1.5. Result Announcement Restriction Check (When Countdown is ON)
  const cookieVal = request.cookies.get("countdown_enabled")?.value;
  const branding = getWebsiteBranding(cookieVal ? cookieVal === "true" : undefined);
  if (branding.countdown?.enabled) {
    return NextResponse.json(
      {
        success: false,
        code: "RESULTS_PENDING",
        message: "Results will be available when the announcement period ends.",
        countdown: {
          targetDate: branding.countdown.targetDate,
          eventTitle: branding.countdown.eventTitle,
          competitionName: branding.countdown.competitionName,
          venue: branding.countdown.venue,
        },
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }

  // 2. Query Parameters Extraction & Normalization
  const { searchParams } = new URL(request.url);
  const rawStudentName = searchParams.get("studentName") || searchParams.get("name");
  const rawCenter = searchParams.get("center") || searchParams.get("examinationCenter");
  const rawFather = searchParams.get("fatherName") || searchParams.get("father");
  const rawSchool = searchParams.get("schoolName") || searchParams.get("school");

  const rawRoll = searchParams.get("rollNumber") || searchParams.get("roll");
  const rawCategory = searchParams.get("category");

  // MODE A: Primary Search by Examination Center & Student Name
  if (rawStudentName !== null || rawCenter !== null) {
    if (!rawStudentName || !rawStudentName.trim()) {
      return NextResponse.json(
        {
          success: false,
          code: "MISSING_STUDENT_NAME",
          message: "Please enter the Student's Name to look up examination results.",
        },
        { status: 400 }
      );
    }

    if (!rawCenter || !rawCenter.trim()) {
      return NextResponse.json(
        {
          success: false,
          code: "MISSING_CENTER",
          message: "Please select your Examination Center from the dropdown.",
        },
        { status: 400 }
      );
    }

    const centerInfo = findCenterByIdOrName(rawCenter);
    if (!centerInfo) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_CENTER",
          message: "Invalid Examination Center. Please select one of the 15 authorized centers.",
        },
        { status: 400 }
      );
    }

    const outcome = await lookupStudentResultByCenter(
      centerInfo.id,
      rawStudentName.trim(),
      rawFather?.trim() || undefined,
      rawSchool?.trim() || undefined
    );

    if (outcome.code === "CENTER_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          success: false,
          code: "CENTER_NOT_CONFIGURED",
          message: outcome.message,
        },
        { status: 503 }
      );
    }

    if (outcome.code === "AMBIGUOUS_STUDENT") {
      return NextResponse.json(
        {
          success: false,
          ambiguityDetected: true,
          duplicateDetected: true,
          code: "AMBIGUOUS_STUDENT",
          message: outcome.message,
        },
        { status: 400 }
      );
    }

    if (outcome.code === "VERIFICATION_FAILED") {
      return NextResponse.json(
        {
          success: false,
          code: "VERIFICATION_FAILED",
          message: outcome.message,
        },
        { status: 404 }
      );
    }

    if (outcome.code === "NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_FOUND",
          message: outcome.message,
        },
        { status: 404 }
      );
    }

    if (outcome.code === "SHEET_ERROR") {
      return NextResponse.json(
        {
          success: false,
          code: "SHEET_ERROR",
          message: outcome.message,
        },
        { status: 503 }
      );
    }

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

    return NextResponse.json(
      {
        success: false,
        code: "NOT_FOUND",
        message: outcome.message || "Record not found.",
      },
      { status: 404 }
    );
  }

  // MODE B: Legacy Search by Roll Number (for backwards compatibility)
  if (!rawRoll || !rawRoll.trim()) {
    return NextResponse.json(
      {
        success: false,
        code: "MISSING_INPUT",
        message: "Please enter Student Name and select Examination Center to verify result.",
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

  const categoriesToCheck: CategoryId[] = 
    category && category !== "all" 
      ? [category] 
      : ["lower", "middle", "overall"];

  let lastNotFoundMsg = `No verified record found for Roll Number "${rollNumber}".`;
  let sheetErrorMsg: string | null = null;

  for (const cat of categoriesToCheck) {
    const outcome = await lookupStudentResultFromSheet(cat, rollNumber);

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

    if (outcome.code === "SHEET_ERROR") {
      sheetErrorMsg = outcome.message || "Examination sheet ledger is currently unavailable.";
    }

    if (outcome.message && outcome.code === "NOT_FOUND") {
      lastNotFoundMsg = outcome.message;
    }
  }

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

  return NextResponse.json(
    {
      success: false,
      code: "NOT_FOUND",
      message: lastNotFoundMsg,
    },
    { status: 404 }
  );
}
