import { StudentResult, CategoryId } from "./types";

export interface SearchResultResponse {
  success: boolean;
  result?: StudentResult;
  message?: string;
  code?: string;
  duplicateDetected?: boolean;
  source?: "google_sheets" | "database" | "demo_verified";
  isDemo?: boolean;
}

export async function lookupStudentResult(
  rollNumber: string,
  category?: CategoryId | "all"
): Promise<SearchResultResponse> {
  const cleanRoll = rollNumber.trim().toUpperCase();
  const queryParams = new URLSearchParams({
    rollNumber: cleanRoll,
  });

  if (category && category !== "all") {
    queryParams.append("category", category);
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
