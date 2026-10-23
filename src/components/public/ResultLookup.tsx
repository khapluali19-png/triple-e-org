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
  CheckCircle2,
  Layers,
  GraduationCap,
  Users
} from "lucide-react";
import { StudentResult, WebsiteBrandingConfig, CandidateMatch } from "@/lib/types";
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
  const [level, setLevel] = useState("");
  const [classOrSection, setClassOrSection] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ 
    code?: string; 
    message: string; 
    duplicate?: boolean; 
    ambiguity?: boolean;
  } | null>(null);
  const [candidates, setCandidates] = useState<CandidateMatch[] | null>(null);
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

    if (!level.trim()) {
      setError({
        code: "MISSING_LEVEL",
        message: "Please select your Examination Level (Level 1, Level 2, or Level 3) from the dropdown.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCandidates(null);

    try {
      const response = await lookupStudentResult({
        studentName: cleanName,
        examinationCenter,
        level: level.trim(),
        classOrSection: classOrSection.trim() || undefined,
        fatherName: fatherName.trim() || undefined,
        schoolName: schoolName.trim() || undefined,
      });

      if (response.success && response.result) {
        setResult(response.result);
        setCandidates(null);

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
        if (response.candidates && response.candidates.length > 0) {
          setCandidates(response.candidates);
        }
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

  const handleQuickTest = (name: string, center: string, lvl?: string, father?: string, school?: string, cls?: string) => {
    if (isCountdownActive) {
      setError({
        code: "RESULTS_PENDING",
        message: "Results will be available when the announcement period ends.",
      });
      return;
    }

    const cleanLvl = lvl || "Level 1";
    setStudentName(name);
    setExaminationCenter(center);
    setLevel(cleanLvl);
    setClassOrSection(cls || "");
    setFatherName(father || "");
    setSchoolName(school || "");
    setError(null);
    setResult(null);
    setCandidates(null);
    setLoading(true);

    setTimeout(() => {
      lookupStudentResult({
        studentName: name,
        examinationCenter: center,
        level: cleanLvl,
        classOrSection: cls || undefined,
        fatherName: father || undefined,
        schoolName: school || undefined,
      })
        .then((res) => {
          if (res.success && res.result) {
            setResult(res.result);
            setCandidates(null);
          } else {
            if (res.candidates && res.candidates.length > 0) {
              setCandidates(res.candidates);
            }
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
              {/* Row 1: Examination Center Dropdown (Required), Student Name (Required) & Level Dropdown (Required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                      <option value="">-- Select Center (15 Centers) --</option>
                      {EXAMINATION_CENTERS.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.name}
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
                    Select your official center.
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
                    Primary search key.
                  </p>
                </div>

                {/* Level Dropdown (Required) */}
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <label 
                    htmlFor="level" 
                    className="block text-xs font-bold uppercase tracking-wider text-[#20252B] flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#183153]" />
                    <span>Level <span className="text-red-500">*</span></span>
                  </label>
                  <div className="relative">
                    <select
                      id="level"
                      disabled={loading || isCountdownActive}
                      value={level}
                      onChange={(e) => {
                        setLevel(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full px-4 py-3 rounded-lg border border-[#E6E9EE] bg-white text-sm font-medium text-[#20252B] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:border-[#183153] focus:ring-1 focus:ring-[#183153] transition-all cursor-pointer appearance-none pr-10"
                    >
                      <option value="">-- Select Level --</option>
                      <option value="Level 1">Level 1</option>
                      <option value="Level 2">Level 2</option>
                      <option value="Level 3">Level 3</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#737B85]">
                    Required category filter.
                  </p>
                </div>
              </div>

              {/* Row 2: Optional Filters (Class, Father's Name, School Name) */}
              <div className="space-y-2 pt-2 border-t border-[#E6E9EE]/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Optional Verification Filters
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Helps resolve duplicate names or missing father records
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Class (Optional) */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="classOrSection" 
                      className="block text-xs font-bold uppercase tracking-wider text-[#20252B] flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[#183153]" />
                        <span>Class</span>
                      </span>
                      <span className="text-[10px] font-normal lowercase text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="classOrSection"
                      type="text"
                      disabled={loading || isCountdownActive}
                      value={classOrSection}
                      onChange={(e) => {
                        setClassOrSection(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="e.g. 5, 8th, 10..."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E6E9EE] text-xs sm:text-sm text-[#20252B] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-400 focus:outline-none focus:border-[#183153] focus:ring-1 focus:ring-[#183153] transition-all"
                    />
                    <p className="text-[11px] text-[#737B85]">
                      Class or grade filter.
                    </p>
                  </div>

                  {/* Father's Name (Optional) */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="fatherName" 
                      className="block text-xs font-bold uppercase tracking-wider text-[#20252B] flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#183153]" />
                        <span>Father&apos;s Name</span>
                      </span>
                      <span className="text-[10px] font-normal lowercase text-slate-400">(optional)</span>
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
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E6E9EE] text-xs sm:text-sm text-[#20252B] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-400 focus:outline-none focus:border-[#183153] focus:ring-1 focus:ring-[#183153] transition-all"
                    />
                    <p className="text-[11px] text-[#737B85]">
                      Father name verification.
                    </p>
                  </div>

                  {/* School Name (Optional) */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="schoolName" 
                      className="block text-xs font-bold uppercase tracking-wider text-[#20252B] flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-[#183153]" />
                        <span>School Name</span>
                      </span>
                      <span className="text-[10px] font-normal lowercase text-slate-400">(optional)</span>
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
                      placeholder="e.g. Khaplu Public School"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E6E9EE] text-xs sm:text-sm text-[#20252B] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-400 focus:outline-none focus:border-[#183153] focus:ring-1 focus:ring-[#183153] transition-all"
                    />
                    <p className="text-[11px] text-[#737B85]">
                      Flexible school matching.
                    </p>
                  </div>
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

            {/* Result Search Help Section */}
            <div id="search-help" className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-[#E6E9EE] text-left space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-[#183153]">
                <HelpCircle className="w-4 h-4 text-[#183153] shrink-0" />
                <h3 className="font-semibold text-[#183153]">How to Check Your Result</h3>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-[#4A5568] leading-relaxed">
                <li>Select your examination center and level, then enter your name to search.</li>
                <li>If multiple candidates have the same name, enter your father&apos;s name to identify your result.</li>
                <li>If your result is still not found, you may not have provided your father&apos;s name during registration. Please check that your name, examination center, and level are correct, and try again.</li>
              </ol>
            </div>

            {/* Quick Test Shortcuts for Demonstration & Testing */}
            <div className="pt-4 border-t border-[#E6E9EE]">
              <span className="text-[11px] font-semibold text-[#737B85] block mb-2">
                Sample Examination Records for Quick Verification:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Own Ali", "ghursay", "Level 1", "Sajjad Hussain", "Zaki Academy")}
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
                  onClick={() => handleQuickTest("Ali Raza", "khaplu", "Level 1", "Muhammad Hussain")}
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
                  onClick={() => handleQuickTest("Fatima Zahra", "khaplu", "Level 2", "Ghulam Mehdi")}
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
                  onClick={() => handleQuickTest("Kareem Ullah", "khaplu", "Level 3", "Sher Khan")}
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
                  onClick={() => handleQuickTest("Ilyas Khan", "keris", "Level 1")}
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
                  onClick={() => handleQuickTest("Mehdi Hassan", "kharfaq", "Level 2")}
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
                  onClick={() => handleQuickTest("Arifa Batool", "ghursay", "Level 2")}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                      : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 cursor-pointer"
                  }`}
                >
                  Arifa Batool (Ghursay - Duplicate Prompt)
                </button>
                <button
                  type="button"
                  disabled={isCountdownActive}
                  onClick={() => handleQuickTest("Sairaa", "dumsum", "Level 1")}
                  className={`px-2.5 py-1 rounded-md text-xs border border-[#E6E9EE] transition-colors ${
                    isCountdownActive 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] cursor-pointer"
                  }`}
                >
                  Sairaa (Dumsum)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Disambiguation / Multi-Match Selection */}
        {candidates && candidates.length > 0 && !result && (
          <div className="max-w-3xl mx-auto rounded-2xl p-6 sm:p-7 border-2 border-amber-300 bg-white text-left shadow-card space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-5 h-5 text-amber-800" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-[#183153]">
                  Matching Candidates Found ({candidates.length})
                </h3>
                <p className="text-xs sm:text-sm text-[#4A5568] leading-relaxed">
                  Multiple candidate records match <strong>&quot;{studentName}&quot;</strong> in <strong>{candidates[0]?.examinationCenter}</strong> ({candidates[0]?.level || level}). Please select your record below based on your school, class, or father&apos;s name to view your result:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {candidates.map((cand, idx) => (
                <div
                  key={cand.candidateId || idx}
                  className="bg-[#FAFAFA] rounded-xl border border-[#E6E9EE] hover:border-[#183153] hover:shadow-card transition-all p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-[#183153] shrink-0" />
                        <span className="font-bold text-sm text-[#183153] truncate">
                          {cand.studentName}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-[#183153]">
                        {cand.level || level}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600">
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-400 shrink-0 w-16">Father:</span>
                        <span className="font-medium text-[#20252B]">
                          {cand.fatherName || <span className="italic text-slate-400">Not recorded</span>}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-400 shrink-0 w-16">School:</span>
                        <span className="font-medium text-[#20252B] line-clamp-1">
                          {cand.schoolName || <span className="italic text-slate-400">Not recorded</span>}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-400 shrink-0 w-16">Class:</span>
                        <span className="font-medium text-[#20252B]">
                          {cand.classOrSection || <span className="italic text-slate-400">Not recorded</span>}
                        </span>
                      </div>
                      {cand.rollNumber && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-slate-400 shrink-0 w-16">Roll No:</span>
                          <span className="font-medium text-[#20252B]">
                            {cand.rollNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (cand.result) {
                        setResult(cand.result);
                        setCandidates(null);
                        setError(null);
                        if (
                          (cand.result.rank && cand.result.rank <= 3) ||
                          (cand.result.percentage && cand.result.percentage >= 85)
                        ) {
                          try {
                            confetti({
                              particleCount: 70,
                              spread: 60,
                              origin: { y: 0.6 },
                              colors: ["#183153", "#D4AF37", "#16A34A"],
                            });
                          } catch {}
                        }
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-lg bg-[#183153] hover:bg-[#12243d] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>View Result</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error States Display */}
        {error && (!candidates || candidates.length === 0) && (
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
                    Additional Verification Required: Multiple Candidates Found
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    {error.message}
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Please enter your Father&apos;s Name in the search form above to identify your result.
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
                    Tip: If your result is still not found, you may not have provided your father&apos;s name during registration. Please check that your name, examination center, and level are correct, and try again.
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
                setLevel("");
                setClassOrSection("");
                setFatherName("");
                setSchoolName("");
                setCandidates(null);
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
