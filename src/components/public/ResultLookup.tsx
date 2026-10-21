"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Search, 
  AlertCircle, 
  Loader2, 
  AlertTriangle,
  Clock,
  School,
  User,
  MapPin,
  HelpCircle,
  CheckCircle2
} from "lucide-react";
import { StudentResult, WebsiteBrandingConfig } from "@/lib/types";
import { DEFAULT_BRANDING, EXAMINATION_CENTERS } from "@/lib/constants";
import { lookupStudentResult } from "@/lib/dataService";
import ResultCard from "./ResultCard";
import confetti from "canvas-confetti";

interface ResultLookupProps {
  branding?: WebsiteBrandingConfig;
}

export default function ResultLookup({ branding = DEFAULT_BRANDING }: ResultLookupProps) {
  const [isCountdownActive, setIsCountdownActive] = useState(() => Boolean(branding?.countdown?.enabled));
  const [studentName, setStudentName] = useState("");
  const [examinationCenter, setExaminationCenter] = useState("ghursay");
  const [fatherName, setFatherName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ 
    code?: string; 
    message: string; 
    duplicate?: boolean; 
    ambiguity?: boolean;
  } | null>(null);
  const [result, setResult] = useState<StudentResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with prop updates
  useEffect(() => {
    setIsCountdownActive(Boolean(branding?.countdown?.enabled));
  }, [branding?.countdown?.enabled]);

  // Client-side synchronization with /api/branding and custom events
  useEffect(() => {
    async function syncStatus() {
      try {
        const res = await fetch("/api/branding", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.branding?.countdown && typeof data.branding.countdown.enabled === "boolean") {
            setIsCountdownActive(data.branding.countdown.enabled);
          } else if (typeof data.branding?.resultsPublished === "boolean") {
            setIsCountdownActive(!data.branding.resultsPublished);
          }
        }
      } catch {
        // non-blocking fallback
      }
    }
    syncStatus();

    const handleEvent = (e: any) => {
      if (typeof e.detail === "boolean") {
        setIsCountdownActive(e.detail);
      }
    };
    window.addEventListener("countdown-toggle", handleEvent);
    return () => window.removeEventListener("countdown-toggle", handleEvent);
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isCountdownActive) {
      setError({
        code: "RESULTS_PENDING",
        message: "Results will be available when the announcement period ends.",
      });
      return;
    }

    const cleanName = studentName.trim();
    if (!cleanName) {
      setError({
        code: "MISSING_STUDENT_NAME",
        message: "Please enter the Student's Name to look up examination results.",
      });
      return;
    }

    if (!examinationCenter) {
      setError({
        code: "MISSING_CENTER",
        message: "Please select your Examination Center from the dropdown.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await lookupStudentResult({
        studentName: cleanName,
        examinationCenter,
        fatherName: fatherName.trim() || undefined,
        schoolName: schoolName.trim() || undefined,
      });

      if (response.success && response.result) {
        setResult(response.result);

        // Fire celebratory confetti if high distinction or top 3 rank
        if (
          (response.result.rank && response.result.rank <= 3) ||
          (response.result.percentage && response.result.percentage >= 85)
        ) {
          try {
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.6 },
              colors: ["#183153", "#D4AF37", "#16A34A"],
            });
          } catch {
            // non-blocking
          }
        }
      } else {
        setError({
          code: response.code || "NOT_FOUND",
          message: response.message || `No result record found for student "${cleanName}".`,
          duplicate: response.duplicateDetected,
          ambiguity: response.ambiguityDetected,
        });
      }
    } catch (err: unknown) {
      setError({
        code: "UNEXPECTED_ERROR",
        message: err instanceof Error ? err.message : "An unexpected network error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = (name: string, center: string, father?: string, school?: string) => {
    if (isCountdownActive) {
      setError({
        code: "RESULTS_PENDING",
        message: "Results will be available when the announcement period ends.",
      });
      return;
    }

    setStudentName(name);
    setExaminationCenter(center);
    setFatherName(father || "");
    setSchoolName(school || "");
    setError(null);
    setResult(null);
    setLoading(true);

    setTimeout(() => {
      lookupStudentResult({
        studentName: name,
        examinationCenter: center,
        fatherName: father || undefined,
        schoolName: school || undefined,
      })
        .then((res) => {
          if (res.success && res.result) {
            setResult(res.result);
          } else {
            setError({
              code: res.code || "NOT_FOUND",
              message: res.message || "Record not found",
              duplicate: res.duplicateDetected,
              ambiguity: res.ambiguityDetected,
            });
          }
        })
        .catch((err) => {
          setError({
            code: "UNEXPECTED_ERROR",
            message: err instanceof Error ? err.message : "Lookup failed.",
          });
        })
        .finally(() => setLoading(false));
    }, 50);
  };

  return (
    <section id="result-lookup" className="py-16 sm:py-24 bg-[#F7F8FA] border-b border-[#E6E9EE]">
      <div id="categories" className="scroll-mt-24" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
        {/* Section Header */}
        <div id="result-lookup-header" className="space-y-3 max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#183153]">
            {branding.competitionTitle}
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-light text-[#183153] tracking-tight">
            Find Your <span className="font-semibold text-[#20252B]">Competition Result</span>
          </h2>
          <p className="text-[#737B85] text-sm sm:text-base leading-relaxed">
            Select your examination center and enter your name below to view your verified academic standing, percentage, and competition level.
          </p>
        </div>

        {/* Search Form Panel (Hidden in Print) */}
        <div id="result-lookup-form" className="max-w-3xl mx-auto text-left">
          <div className="bg-white rounded-2xl border border-[#E6E9EE] p-6 sm:p-8 shadow-card space-y-6">
            {isCountdownActive && (
              <div className="p-4 sm:p-5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Announcement Period Active</span>
                </div>
                <p className="text-sm font-semibold text-amber-950">
                  Results will be available when the announcement period ends.
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Candidate result search and online scorecard verification are temporarily paused until the official ceremony on <strong>25 October 2026, Sunday, at 11:30 AM</strong> at Government Boys High School Khaplu.
                </p>
              </div>
            )}

            <form onSubmit={handleSearch} className="space-y-5">
              {/* Row 1: Examination Center Dropdown (Required) & Student Name (Required) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Examination Center Dropdown */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="examinationCenter" 
                    className="block text-xs font-bold uppercase tracking-wider text-[#20252B] flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#183153]" />
                    <span>Examination Center <span className="text-red-500">*</span></span>
                  </label>
                  <div className="relative">
                    <select
                      id="examinationCenter"
                      disabled={loading || isCountdownActive}
                      value={examinationCenter}
                      onChange={(e) => {
                        setExaminationCenter(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full px-4 py-3 rounded-lg border border-[#E6E9EE] bg-white text-sm font-medium text-[#20252B] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:border-[#183153] focus:ring-1 focus:ring-[#183153] transition-all cursor-pointer appearance-none pr-10"
                    >
                      <option value="">-- Select Examination Center (15 Centers) --</option>
                      {EXAMINATION_CENTERS.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.name} {center.id === "dumsum" ? "(Unconnected Ledger)" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#737B85]">
                    Each center searches only its own connected Google Sheet ledger.
                  </p>
                </div>

                {/* Student Name Input */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="studentName" 
                    className="block text-xs font-bold uppercase tracking-wider text-[#20252B] flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-[#183153]" />
                    <span>Student Name <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    ref={inputRef}
                    id="studentName"
                    type="text"
                    disabled={loading || isCountdownActive}
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Ali Raza, Fatima Zahra..."
                    className="w-full px-4 py-3 rounded-lg border border-[#E6E9EE] text-sm text-[#20252B] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-400 focus:outline-none focus:border-[#183153] focus:ring-1 focus:ring-[#183153] transition-all"
                  />
                  <p className="text-[11px] text-[#737B85]">
                    Primary search key. Roll number is not required.
                  </p>
                </div>
              </div>

              {/* Row 2: Father's Name (Optional) & School Name (Optional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Father's Name */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="fatherName" 
                    className="block text-xs font-bold uppercase tracking-wider text-[#20252B] flex items-center justify-between"
                  >
                    <span>Father&apos;s Name</span>
                    <span className="text-[10px] font-normal lowercase text-slate-400">(optional verification)</span>
                  </label>
                  <input
                    id="fatherName"
                    type="text"
                    disabled={loading || isCountdownActive}
                    value={fatherName}
                    onChange={(e) => {
                      setFatherName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Muhammad Hussain"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#E6E9EE] text-xs sm:text-sm text-[#20252B] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-400 focus:outline-none focus:border-[#183153] focus:ring-1 focus:ring-[#183153] transition-all"
                  />
                  <p className="text-[11px] text-[#737B85]">
                    Recommended if multiple students share your name.
                  </p>
                </div>

                {/* School Name */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="schoolName" 
                    className="block text-xs font-bold uppercase tracking-wider text-[#20252B] flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-[#183153]" />
                      <span>School Name</span>
                    </span>
                    <span className="text-[10px] font-normal lowercase text-slate-400">(optional verification)</span>
                  </label>
                  <input
                    id="schoolName"
                    type="text"
                    disabled={loading || isCountdownActive}
                    value={schoolName}
                    onChange={(e) => {
                      setSchoolName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Govt High School Khaplu"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#E6E9EE] text-xs sm:text-sm text-[#20252B] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-400 focus:outline-none focus:border-[#183153] focus:ring-1 focus:ring-[#183153] transition-all"
                  />
                  <p className="text-[11px] text-[#737B85]">
                    Helps distinguish candidates with identical names.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading || isCountdownActive}
                  className={`w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-lg ${
                    isCountdownActive 
                      ? "bg-slate-400 cursor-not-allowed text-white" 
                      : "bg-[#183153] hover:bg-[#12243d] disabled:bg-slate-400 text-white cursor-pointer"
                  } font-semibold text-sm transition-all gap-2 shadow-xs`}
                >
                  {isCountdownActive ? (
                    <>
                      <Clock className="w-4 h-4 text-white" />
                      <span>Results Available After Announcement</span>
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Searching Examination Ledger...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 text-white" />
                      <span>Find Result</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Test Shortcuts for Demonstration & Testing */}
            <div className="pt-4 border-t border-[#E6E9EE]">
              <span className="text-[11px] font-semibold text-[#737B85] block mb-2">
                Sample Examination Records for Quick Verification:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Own Ali", "ghursay", "Sajjad Hussain", "Zaki Academy")}
                  className={`px-2.5 py-1 rounded-md text-xs border border-[#E6E9EE] transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-[#183153] hover:bg-[#12243d] text-white font-medium cursor-pointer shadow-2xs"
                  }`}
                >
                  Own Ali (Ghursay, Level 1)
                </button>
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Ali Raza", "khaplu", "Muhammad Hussain")}
                  className={`px-2.5 py-1 rounded-md text-xs border border-[#E6E9EE] transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] cursor-pointer"
                  }`}
                >
                  Ali Raza (Khaplu, Level 1)
                </button>
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Fatima Zahra", "khaplu", "Ghulam Mehdi")}
                  className={`px-2.5 py-1 rounded-md text-xs border border-[#E6E9EE] transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] cursor-pointer"
                  }`}
                >
                  Fatima Zahra (Khaplu, Level 2)
                </button>
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Kareem Ullah", "khaplu", "Sher Khan")}
                  className={`px-2.5 py-1 rounded-md text-xs border border-[#E6E9EE] transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] cursor-pointer"
                  }`}
                >
                  Kareem Ullah (Khaplu, Level 3)
                </button>
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Ilyas Khan", "keris")}
                  className={`px-2.5 py-1 rounded-md text-xs border border-[#E6E9EE] transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] cursor-pointer"
                  }`}
                >
                  Ilyas Khan (Keris)
                </button>
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Mehdi Hassan", "kharfaq")}
                  className={`px-2.5 py-1 rounded-md text-xs border border-[#E6E9EE] transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] cursor-pointer"
                  }`}
                >
                  Mehdi Hassan (Kharfaq)
                </button>
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Muhammad Ali", "khaplu")}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                      : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 cursor-pointer"
                  }`}
                >
                  Muhammad Ali (Ambiguity Test)
                </button>
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Student", "dumsum")}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer"
                  }`}
                >
                  Dumsum (Unconnected Center Test)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error States Display */}
        {error && (
          <div className="max-w-3xl mx-auto rounded-xl p-5 border text-left bg-white shadow-subtle animate-in fade-in">
            {error.code === "RESULTS_PENDING" ? (
              <div className="flex items-start gap-3.5">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-amber-900">
                    Results Announcement Pending
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    {error.message}
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    The official result announcement is scheduled for 25 October 2026, Sunday, at 11:30 AM (PKT) at Government Boys High School Khaplu.
                  </p>
                </div>
              </div>
            ) : error.code === "AMBIGUOUS_STUDENT" ? (
              <div className="flex items-start gap-3.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-amber-900">
                    Additional Verification Required: Multiple Students Found
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {error.message}
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    To protect student privacy and ensure correct scorecard display, please enter your Father&apos;s Name or School Name in the search form above.
                  </p>
                </div>
              </div>
            ) : error.code === "CENTER_NOT_CONFIGURED" ? (
              <div className="flex items-start gap-3.5">
                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#183153]">
                    Examination Center Ledger Not Yet Connected
                  </h4>
                  <p className="text-xs text-[#737B85] leading-relaxed">
                    {error.message}
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    The examination committee is currently synchronizing the spreadsheet for this center. If you are an administrator, configure this center in the Admin Dashboard.
                  </p>
                </div>
              </div>
            ) : error.code === "VERIFICATION_FAILED" ? (
              <div className="flex items-start gap-3.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-red-900">
                    Verification Mismatch
                  </h4>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {error.message}
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Please ensure the student name, father&apos;s name, and school name match your official competition registration details.
                  </p>
                </div>
              </div>
            ) : error.code === "NOT_FOUND" ? (
              <div className="flex items-start gap-3.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#20252B]">
                    Student Result Not Found
                  </h4>
                  <p className="text-xs text-[#737B85] leading-relaxed">
                    {error.message}
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Tip: Verify your selected Examination Center and ensure your name spelling matches the official competition admit card.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-red-900">
                    Search Error
                  </h4>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {error.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matching Student Result Card */}
        {result && (
          <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ResultCard
              result={result}
              onReset={() => {
                setResult(null);
                setStudentName("");
                setFatherName("");
                setSchoolName("");
                setError(null);
              }}
              branding={branding}
            />
          </div>
        )}
      </div>
    </section>
  );
}
