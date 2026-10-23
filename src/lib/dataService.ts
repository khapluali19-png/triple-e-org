import { StudentResult, CategoryId } from "./types";

export interface SearchResultResponse {
  success: boolean;
  result?: StudentResult;
  message?: string;
  code?: string;
  duplicateDetected?: boolean;
  ambiguityDetected?: boolean;
  source?: "google_sheets" | "database" | "demo_verified";
  isDemo?: boolean;
}

export interface StudentSearchParams {
  studentName: string;
  examinationCenter: string;
  level?: string;
  fatherName?: string;
  schoolName?: string;
}

export async function lookupStudentResult(
  paramOrRoll: string | StudentSearchParams,
  category?: CategoryId | "all"
): Promise<SearchResultResponse> {
  const queryParams = new URLSearchParams();

  if (typeof paramOrRoll === "object") {
    queryParams.set("studentName", paramOrRoll.studentName.trim());
    queryParams.set("center", paramOrRoll.examinationCenter.trim());
    if (paramOrRoll.level && paramOrRoll.level.trim()) {
      queryParams.set("level", paramOrRoll.level.trim());
    }
    if (paramOrRoll.fatherName && paramOrRoll.fatherName.trim()) {
      queryParams.set("fatherName", paramOrRoll.fatherName.trim());
    }
    if (paramOrRoll.schoolName && paramOrRoll.schoolName.trim()) {
      queryParams.set("schoolName", paramOrRoll.schoolName.trim());
    }
  } else {
    const cleanRoll = paramOrRoll.trim().toUpperCase();
    queryParams.set("rollNumber", cleanRoll);
    if (category && category !== "all") {
      queryParams.set("category", category);
    }
  }

  try {
    const response = await fetch(`/api/results?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        code: data.code || "LOOKUP_FAILED",
        message: data.message || "Failed to query competition examination records.",
        duplicateDetected: data.duplicateDetected,
        ambiguityDetected: data.ambiguityDetected,
      };
    }

    return data;
  } catch (err: unknown) {
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: err instanceof Error ? err.message : "A network connection error occurred while querying records.",
    };
  }
}

export async function searchStudentResult(params: StudentSearchParams): Promise<SearchResultResponse> {
  return lookupStudentResult(params);
}
