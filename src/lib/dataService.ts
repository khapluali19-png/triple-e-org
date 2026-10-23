import { StudentResult, CategoryId, CandidateMatch } from "./types";

export interface SearchResultResponse {
  success: boolean;
  result?: StudentResult;
  candidates?: CandidateMatch[];
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
  classOrSection?: string;
  fatherName?: string;
  schoolName?: string;
  candidateIndex?: number;
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
    if (paramOrRoll.classOrSection && paramOrRoll.classOrSection.trim()) {
      queryParams.set("class", paramOrRoll.classOrSection.trim());
    }
    if (paramOrRoll.fatherName && paramOrRoll.fatherName.trim()) {
      queryParams.set("fatherName", paramOrRoll.fatherName.trim());
    }
    if (paramOrRoll.schoolName && paramOrRoll.schoolName.trim()) {
      queryParams.set("schoolName", paramOrRoll.schoolName.trim());
    }
    if (paramOrRoll.candidateIndex !== undefined && paramOrRoll.candidateIndex !== null) {
      queryParams.set("candidateIndex", String(paramOrRoll.candidateIndex));
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
        candidates: data.candidates,
      };
    }

    return {
      success: Boolean(data.success),
      result: data.result,
      candidates: data.candidates,
      code: data.code,
      message: data.message,
      duplicateDetected: data.duplicateDetected,
      ambiguityDetected: data.ambiguityDetected,
    };
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
