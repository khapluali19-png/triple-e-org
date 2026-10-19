"use client";

import { useState, useRef } from "react";
import { 
  Search, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Layers
} from "lucide-react";
import { CategoryId, StudentResult, WebsiteBrandingConfig } from "@/lib/types";
import { DEFAULT_BRANDING, CATEGORIES } from "@/lib/constants";
import { lookupStudentResult } from "@/lib/dataService";
import ResultCard from "./ResultCard";
import confetti from "canvas-confetti";

interface ResultLookupProps {
  branding?: WebsiteBrandingConfig;
}

export default function ResultLookup({ branding = DEFAULT_BRANDING }: ResultLookupProps) {
  const [rollNumber, setRollNumber] = useState("");
  const [category, setCategory] = useState<CategoryId>("lower");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string; duplicate?: boolean } | null>(null);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [isDemoSource, setIsDemoSource] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleCategorySelect = (selectedCat: CategoryId) => {
    setCategory(selectedCat);
    if (error) setError(null);
    // Focus the roll number input for immediate typing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanRoll = rollNumber.trim().toUpperCase();
    if (!cleanRoll) {
      setError({
        code: "MISSING_ROLL_NUMBER",
        message: "Please enter your designated Roll Number (e.g., TE-101 or 0042) to verify your result.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await lookupStudentResult(cleanRoll, category);
      if (response.success && response.result) {
        setResult(response.result);
        setIsDemoSource(!!response.isDemo);

        // Fire celebratory confetti if high distinction or top 3 rank
        if (response.result.rank && response.result.rank <= 3) {
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
          message: response.message || `No result found for Roll Number "${cleanRoll}" in the selected category.`,
          duplicate: response.duplicateDetected,
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

  const handleQuickLookup = (quickRoll: string, quickCategory: CategoryId) => {
    setRollNumber(quickRoll);
    setCategory(quickCategory);
    setError(null);
    setResult(null);
    setLoading(true);

    setTimeout(() => {
      lookupStudentResult(quickRoll, quickCategory)
        .then((res) => {
          if (res.success && res.result) {
            setResult(res.result);
            setIsDemoSource(!!res.isDemo);
          } else {
            setError({
              code: res.code || "NOT_FOUND",
              message: res.message || "Record not found",
              duplicate: res.duplicateDetected,
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
        {/* Section Header: Exact wording from Prompt */}
        <div id="result-lookup-header" className="space-y-3 max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#183153]">
            {branding.competitionTitle}
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-light text-[#183153] tracking-tight">
            Find Your <span className="font-semibold text-[#20252B]">Competition Result</span>
          </h2>
          <p className="text-[#737B85] text-sm sm:text-base leading-relaxed">
            Select your category and enter your roll number to view your result.
          </p>
        </div>

        {/* Categories & Search Panel (Hidden in Print) */}
        <div id="result-lookup-form" className="space-y-8">
          {/* Step 1: Three Distinct Editorial Category Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            {/* Category 1: Lower Class */}
            <button
              type="button"
              onClick={() => handleCategorySelect("lower")}
              className={`p-6 rounded-xl border text-left transition-all cursor-pointer relative bg-white ${
                category === "lower"
                  ? "border-[#183153] shadow-card ring-1 ring-[#183153]"
                  : "border-[#E6E9EE] hover:border-slate-400 shadow-subtle"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#183153] block">
                    Primary Tier • Grades 3 – 5
                  </span>
                  <h3 className="font-heading text-xl font-bold text-[#20252B] mt-1">
                    Lower Class
                  </h3>
                  <p className="text-xs text-[#737B85] mt-2 leading-relaxed">
                    General Science, Basic Mathematics, Environmental Studies &amp; General Knowledge.
                  </p>
                </div>
                {category === "lower" && (
                  <span className="p-1 rounded-full bg-[#183153] text-white shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-[#E6E9EE] flex items-center justify-between text-[11px] text-[#737B85]">
                <span>Total Marks: 100</span>
                <span className={category === "lower" ? "text-[#183153] font-semibold" : ""}>
                  {category === "lower" ? "Active Selection" : "Click to Select"}
                </span>
              </div>
            </button>

            {/* Category 2: Middle Class */}
            <button
              type="button"
              onClick={() => handleCategorySelect("middle")}
              className={`p-6 rounded-xl border text-left transition-all cursor-pointer relative bg-white ${
                category === "middle"
                  ? "border-[#183153] shadow-card ring-1 ring-[#183153]"
                  : "border-[#E6E9EE] hover:border-slate-400 shadow-subtle"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#183153] block">
                    Junior Secondary • Grades 6 – 8
                  </span>
                  <h3 className="font-heading text-xl font-bold text-[#20252B] mt-1">
                    Middle Class
                  </h3>
                  <p className="text-xs text-[#737B85] mt-2 leading-relaxed">
                    Integrated Sciences, Mathematics &amp; Logic, Geography &amp; English Comprehension.
                  </p>
                </div>
                {category === "middle" && (
                  <span className="p-1 rounded-full bg-[#183153] text-white shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-[#E6E9EE] flex items-center justify-between text-[11px] text-[#737B85]">
                <span>Total Marks: 100</span>
                <span className={category === "middle" ? "text-[#183153] font-semibold" : ""}>
                  {category === "middle" ? "Active Selection" : "Click to Select"}
                </span>
              </div>
            </button>

            {/* Category 3: Overall Championship */}
            <button
              type="button"
              onClick={() => handleCategorySelect("overall")}
              className={`p-6 rounded-xl border text-left transition-all cursor-pointer relative bg-white ${
                category === "overall"
                  ? "border-[#183153] shadow-card ring-1 ring-[#183153]"
                  : "border-[#E6E9EE] hover:border-slate-400 shadow-subtle"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#183153] block">
                    Comprehensive Championship Tier
                  </span>
                  <h3 className="font-heading text-xl font-bold text-[#20252B] mt-1">
                    Overall Category
                  </h3>
                  <p className="text-xs text-[#737B85] mt-2 leading-relaxed">
                    Advanced Sciences, Tech, Mathematics Problem Solving, World History &amp; Sustainability.
                  </p>
                </div>
                {category === "overall" && (
                  <span className="p-1 rounded-full bg-[#183153] text-white shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-[#E6E9EE] flex items-center justify-between text-[11px] text-[#737B85]">
                <span>Total Marks: 100</span>
                <span className={category === "overall" ? "text-[#183153] font-semibold" : ""}>
                  {category === "overall" ? "Active Selection" : "Click to Select"}
                </span>
              </div>
            </button>
          </div>

          {/* Step 2: Roll Number Search Bar */}
          <div className="bg-white rounded-xl border border-[#E6E9EE] p-6 sm:p-8 shadow-subtle max-w-2xl mx-auto text-left">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label
                  htmlFor="rollNumber"
                  className="block text-xs font-bold uppercase tracking-wider text-[#20252B] mb-2"
                >
                  Enter Candidate Roll Number
                </label>
                <div className="relative flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      id="rollNumber"
                      type="text"
                      value={rollNumber}
                      onChange={(e) => {
                        setRollNumber(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="e.g. TE-101, TE-102, 0042..."
                      className="w-full px-4 py-3 rounded-lg border border-[#E6E9EE] focus:outline-none focus:border-[#183153] focus:ring-1 focus:ring-[#183153] font-mono text-base uppercase text-[#20252B] placeholder:normal-case placeholder:text-slate-400 placeholder:font-sans transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#183153] hover:bg-[#12243d] disabled:bg-slate-400 text-white font-semibold text-sm transition-colors cursor-pointer gap-2 shrink-0"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 text-white" />
                        <span>Check Result</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Helpful Input Note */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#737B85] pt-1">
                <span>
                  Searching <strong>{category === "lower" ? "Lower Class" : category === "middle" ? "Middle Class" : "Overall Category"}</strong> ledger only.
                </span>
                <span className="font-mono">Leading zeros preserved (e.g. 0042)</span>
              </div>
            </form>

            {/* Quick Test Shortcuts for Evaluation Committee */}
            <div className="pt-5 mt-5 border-t border-[#E6E9EE]">
              <span className="text-[11px] font-semibold text-[#737B85] block mb-2">
                Sample Examination Records for Testing:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLookup("TE-101", "lower")}
                  className="px-2.5 py-1 rounded-md bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] text-xs font-mono border border-[#E6E9EE] transition-colors"
                >
                  TE-101 (Lower)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLookup("0042", "lower")}
                  className="px-2.5 py-1 rounded-md bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] text-xs font-mono border border-[#E6E9EE] transition-colors"
                >
                  0042 (Leading 0)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLookup("TE-102", "middle")}
                  className="px-2.5 py-1 rounded-md bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] text-xs font-mono border border-[#E6E9EE] transition-colors"
                >
                  TE-102 (Middle)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLookup("0088", "middle")}
                  className="px-2.5 py-1 rounded-md bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] text-xs font-mono border border-[#E6E9EE] transition-colors"
                >
                  0088 (Middle 0)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLookup("TE-103", "overall")}
                  className="px-2.5 py-1 rounded-md bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] text-xs font-mono border border-[#E6E9EE] transition-colors"
                >
                  TE-103 (Overall)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLookup("0007", "overall")}
                  className="px-2.5 py-1 rounded-md bg-[#F7F8FA] hover:bg-slate-200 text-[#20252B] text-xs font-mono border border-[#E6E9EE] transition-colors"
                >
                  0007 (Overall 0)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error States Display */}
        {error && (
          <div className="max-w-2xl mx-auto rounded-xl p-5 border text-left bg-white shadow-subtle animate-in fade-in">
            {error.code === "NOT_FOUND" ? (
              <div className="flex items-start gap-3.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#20252B]">
                    Result Not Found in Selected Category
                  </h4>
                  <p className="text-xs text-[#737B85] leading-relaxed">
                    {error.message}
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Tip: Verify your roll number on your competition admit card, or confirm you have selected the correct category (Lower, Middle, or Overall).
                  </p>
                </div>
              </div>
            ) : error.code === "DUPLICATE_ROLL" ? (
              <div className="flex items-start gap-3.5">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-red-900">
                    Record Integrity Warning: Duplicate Roll Number
                  </h4>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {error.message}
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    To preserve evaluation integrity, ambiguous records cannot be displayed. Please contact the Triple E Examination Cell.
                  </p>
                </div>
              </div>
            ) : error.code === "SHEET_UNAVAILABLE" ? (
              <div className="flex items-start gap-3.5">
                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#183153]">
                    Category Ledger Synchronization in Progress
                  </h4>
                  <p className="text-xs text-[#737B85] leading-relaxed">
                    {error.message}
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    The examination committee is updating the official records. Please check back shortly.
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
                setRollNumber("");
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
