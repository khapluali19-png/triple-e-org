import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthorization } from "@/lib/server/adminAuth";
import { 
  fetchSheetValues, 
  extractSpreadsheetId, 
  normalizeRollNumber, 
  findColumnIndex, 
  HEADER_ALIASES, 
  validateAndCalculateMarks,
  lookupStudentResultByCenter 
} from "@/lib/server/googleSheetsService";
import { getServerCategoryStore } from "@/lib/server/configStore";
import { CategoryId } from "@/lib/types";

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
    const { 
      centerId,
      studentName: reqStudentName,
      fatherName: reqFatherName,
      schoolName,
      level: reqLevel,
      classOrSection: reqClass,
      candidateIndex: reqCandIdx,
      categoryId, 
      rollNumber, 
      spreadsheetUrl, 
      worksheetName, 
      headerRowIndex = 1,
      columnMappings = {} 
    } = body;

    // Center / Student Name test lookup
    if (centerId || reqStudentName) {
      const targetCenter = centerId || "khaplu";
      const targetName = reqStudentName || rollNumber || "Ali Raza";
      const outcome = await lookupStudentResultByCenter(
        targetCenter,
        targetName,
        reqFatherName,
        schoolName,
        reqLevel || "Level 1",
        reqClass,
        reqCandIdx
      );
      return NextResponse.json({
        ...outcome,
        detectedColumns: {
          studentName: "Name",
          fatherName: "Father Name",
          obtainedMarks: "Obt. Marks",
          totalMarks: "Total Marks",
        },
        diagnosticNote: "Center result record resolved from Google Sheets ledger.",
      });
    }

    const cleanRoll = normalizeRollNumber(rollNumber);
    if (!cleanRoll) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid Roll Number to test." },
        { status: 400 }
      );
    }

    // Determine target spreadsheet and worksheet
    let targetSpreadsheetId: string | null = null;
    let targetWorksheetName = worksheetName || "";

    if (spreadsheetUrl) {
      targetSpreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    }

    // If not supplied in request, read from category config
    if (!targetSpreadsheetId && categoryId) {
      const store = getServerCategoryStore();
      const conn = store.categories[categoryId as CategoryId];
      if (conn && conn.spreadsheetId) {
        targetSpreadsheetId = conn.spreadsheetId;
        if (!targetWorksheetName) {
          targetWorksheetName = conn.worksheetName;
        }
      }
    }

    if (!targetSpreadsheetId) {
      return NextResponse.json(
        { success: false, message: "No spreadsheet URL or ID configured for this category." },
        { status: 400 }
      );
    }

    // Fetch sheet data
    const { headers, rows } = await fetchSheetValues(
      targetSpreadsheetId,
      targetWorksheetName,
      Number(headerRowIndex) || 1
    );

    if (headers.length === 0) {
      return NextResponse.json(
        { success: false, message: "Spreadsheet contains no header columns." },
        { status: 400 }
      );
    }

    // Resolve column indices flexibly
    const rollColIdx = findColumnIndex(headers, columnMappings.rollNumber, HEADER_ALIASES.rollNumber);
    const nameColIdx = findColumnIndex(headers, columnMappings.studentName, HEADER_ALIASES.studentName);
    const fatherColIdx = findColumnIndex(headers, columnMappings.fatherName, HEADER_ALIASES.fatherName);
    const obtainedColIdx = findColumnIndex(headers, columnMappings.obtainedMarks, HEADER_ALIASES.obtainedMarks);
    const totalColIdx = findColumnIndex(headers, columnMappings.totalMarks, HEADER_ALIASES.totalMarks);

    if (rollColIdx === -1) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Unable to detect the Roll Number column in this spreadsheet. Please check column mappings or sheet headings.",
          headers 
        },
        { status: 400 }
      );
    }

    // Search rows for candidate
    const matchingRows: string[][] = [];
    for (const row of rows) {
      const rawVal = row[rollColIdx];
      if (normalizeRollNumber(rawVal) === cleanRoll) {
        matchingRows.push(row);
      }
    }

    if (matchingRows.length > 1) {
      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_ROLL",
          duplicateDetected: true,
          message: `Duplicate collision: Found ${matchingRows.length} matching rows for Roll Number "${cleanRoll}". Roll numbers must be unique within a category.`,
          detectedColumns: {
            rollNumber: headers[rollColIdx],
            studentName: nameColIdx !== -1 ? headers[nameColIdx] : null,
            fatherName: fatherColIdx !== -1 ? headers[fatherColIdx] : null,
            obtainedMarks: obtainedColIdx !== -1 ? headers[obtainedColIdx] : null,
            totalMarks: totalColIdx !== -1 ? headers[totalColIdx] : null,
          },
        },
        { status: 409 }
      );
    }

    if (matchingRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_FOUND",
          message: `No candidate record was found matching Roll Number "${cleanRoll}" in worksheet "${targetWorksheetName || "Default"}".`,
          detectedColumns: {
            rollNumber: headers[rollColIdx],
            studentName: nameColIdx !== -1 ? headers[nameColIdx] : null,
            fatherName: fatherColIdx !== -1 ? headers[fatherColIdx] : null,
            obtainedMarks: obtainedColIdx !== -1 ? headers[obtainedColIdx] : null,
            totalMarks: totalColIdx !== -1 ? headers[totalColIdx] : null,
          },
          totalRowsSearched: rows.length,
        },
        { status: 404 }
      );
    }

    const row = matchingRows[0];
    const getVal = (idx: number) => (idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : "");

    const studentName = getVal(nameColIdx) || "Candidate";
    const fatherName = getVal(fatherColIdx);
    const rawObtained = getVal(obtainedColIdx);
    const rawTotal = getVal(totalColIdx);

    const marksEval = validateAndCalculateMarks(rawObtained, rawTotal);
    if (!marksEval.valid) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_MARKS_DATA",
          message: marksEval.errorMessage || "Marks data is invalid for this candidate.",
          result: {
            rollNumber: cleanRoll,
            studentName,
            fatherName: fatherName || undefined,
            rawObtained,
            rawTotal,
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Candidate verified successfully!`,
      detectedColumns: {
        rollNumber: headers[rollColIdx],
        studentName: nameColIdx !== -1 ? headers[nameColIdx] : null,
        fatherName: fatherColIdx !== -1 ? headers[fatherColIdx] : null,
        obtainedMarks: obtainedColIdx !== -1 ? headers[obtainedColIdx] : null,
        totalMarks: totalColIdx !== -1 ? headers[totalColIdx] : null,
      },
      result: {
        rollNumber: cleanRoll,
        studentName,
        fatherName: fatherName || undefined,
        obtainedMarks: marksEval.obtainedMarks,
        totalMarks: marksEval.totalMarks,
        percentage: marksEval.percentage,
        grade: marksEval.grade,
      },
      diagnosticNote: `Dynamic grade computed: (${marksEval.obtainedMarks} / ${marksEval.totalMarks}) * 100 = ${marksEval.percentage}% -> Grade ${marksEval.grade}. Sheet Status column is ignored.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || "An unexpected error occurred during test lookup.",
      },
      { status: 500 }
    );
  }
}
