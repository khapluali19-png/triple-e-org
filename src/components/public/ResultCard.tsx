"use client";

import Image from "next/image";
import { 
  Printer, 
  Award, 
  CheckCircle, 
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import { StudentResult, WebsiteBrandingConfig } from "@/lib/types";
import { formatOrdinal, getAwardBadgeVariant } from "@/lib/utils";
import { DEFAULT_BRANDING, CATEGORIES } from "@/lib/constants";

interface ResultCardProps {
  result: StudentResult;
  onReset?: () => void;
  branding?: WebsiteBrandingConfig;
}

export default function ResultCard({ 
  result, 
  onReset, 
  branding = DEFAULT_BRANDING 
}: ResultCardProps) {
  const categoryInfo = CATEGORIES.find((c) => c.id === result.category) || CATEGORIES[0];
  const award = getAwardBadgeVariant(result.percentage, result.rank);

  const cardLabels = branding.resultCardLabels || DEFAULT_BRANDING.resultCardLabels;
  const visibility = branding.fieldVisibility || DEFAULT_BRANDING.fieldVisibility;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 text-left">
      {/* Printable Scorecard Container */}
      <div className="printable-card bg-white border border-[#E6E9EE] rounded-xl shadow-subtle overflow-hidden transition-all">
        {/* Certificate / Scorecard Header */}
        <div className="p-6 sm:p-8 border-b border-[#E6E9EE] bg-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-[#E6E9EE] bg-white p-1 shadow-xs shrink-0">
                <Image
                  src={branding.logoUrl || "/images/logos/triple-e-logo.jpg"}
                  alt={branding.organizationName}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#183153] block">
                  {cardLabels.scorecardTitle || "Official Verification Scorecard"}
                </span>
                <h2 className="font-heading text-lg sm:text-xl font-bold text-[#183153]">
                  {branding.organizationName}
                </h2>
                <p className="text-xs text-[#737B85] font-medium">
                  {branding.competitionTitle} • District Ghanche, Gilgit-Baltistan
                </p>
                <p className="text-[10px] text-slate-400">
                  Education · Empowerment · Environment
                </p>
              </div>
            </div>

            {/* Position / Merit Pill */}
            <div className="sm:text-right shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border ${award.badgeClass}`}>
                <Award className="w-3.5 h-3.5" />
                <span>{award.label}</span>
              </span>
              <p className="text-[11px] text-[#737B85] mt-1 font-mono">
                Roll No: #{result.rollNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Student Profile Info Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[#F7F8FA] p-4 rounded-lg border border-[#E6E9EE]">
            <div>
              <span className="text-[10px] font-bold text-[#737B85] uppercase tracking-wider block">
                Candidate Name
              </span>
              <p className="font-heading text-base font-bold text-[#20252B] mt-0.5">
                {result.studentName}
              </p>
              {result.fatherName && (
                <p className="text-xs text-[#737B85] mt-0.5">
                  <span className="font-medium text-slate-500">Father:</span> {result.fatherName}
                </p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#737B85] uppercase tracking-wider block">
                Roll Number
              </span>
              <p className="font-mono text-base font-bold text-[#183153] mt-0.5">
                {result.rollNumber}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle className="w-3 h-3" /> Verified Record
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#737B85] uppercase tracking-wider block">
                Category
              </span>
              <p className="text-sm font-semibold text-[#20252B] mt-0.5">
                {categoryInfo.title}
              </p>
              <span className="text-xs text-[#737B85]">
                {categoryInfo.grades}
              </span>
            </div>

            {visibility.showSchoolName && (
              <div>
                <span className="text-[10px] font-bold text-[#737B85] uppercase tracking-wider block">
                  Institution / School
                </span>
                <p className="text-xs sm:text-sm font-medium text-[#20252B] mt-0.5">
                  {result.schoolName || "District Ghanche School"}
                </p>
                {visibility.showClassOrSection && result.classOrSection && (
                  <span className="text-[11px] text-[#737B85] block">Class: {result.classOrSection}</span>
                )}
                {visibility.showDistrict && result.district && (
                  <span className="text-[11px] text-[#737B85] block">District: {result.district}</span>
                )}
              </div>
            )}
          </div>

          {/* Performance Summary Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-white border border-[#E6E9EE] flex flex-col justify-between">
              <span className="text-xs text-[#737B85] font-medium uppercase tracking-wider">
                Marks Scored
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-3xl font-bold text-[#183153]">
                  {result.obtainedMarks}
                </span>
                <span className="text-sm text-[#737B85]">/ {result.totalMarks}</span>
              </div>
              <span className="text-[11px] text-[#737B85] mt-1">
                Official Marks
              </span>
            </div>

            <div className="p-4 rounded-lg bg-white border border-[#E6E9EE] flex flex-col justify-between">
              <span className="text-xs text-[#737B85] font-medium uppercase tracking-wider">
                Percentage
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-3xl font-bold text-[#183153]">
                  {result.percentage}%
                </span>
              </div>
              <span className="text-[11px] text-[#737B85] mt-1">
                Standard Evaluation
              </span>
            </div>

            <div className="p-4 rounded-lg bg-white border border-[#E6E9EE] flex flex-col justify-between">
              <span className="text-xs text-[#737B85] font-medium uppercase tracking-wider">
                Official Grade
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-3xl font-bold text-[#183153]">
                  {result.grade || "N/A"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  result.grade === "A+"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : result.grade === "A"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : result.grade === "B"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : result.grade === "C"
                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}>
                  {result.grade === "A+" ? "Outstanding" : result.grade === "A" ? "Excellent" : result.grade === "B" ? "Very Good" : result.grade === "C" ? "Good" : "Pass"}
                </span>
              </div>
              <span className="text-[11px] text-[#737B85] mt-1">
                Dynamic Standard
              </span>
            </div>

            {visibility.showRank ? (
              <div className="p-4 rounded-lg bg-white border border-[#E6E9EE] flex flex-col justify-between">
                <span className="text-xs text-[#737B85] font-medium uppercase tracking-wider">
                  Official Standing
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  {result.rank ? (
                    <>
                      <span className="font-heading text-3xl font-bold text-[#183153]">
                        {formatOrdinal(result.rank)}
                      </span>
                      <span className="text-xs font-semibold text-[#737B85] ml-1">Position</span>
                    </>
                  ) : (
                    <span className="font-heading text-xl font-bold text-[#20252B]">
                      Participant
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#737B85] mt-1">
                  {result.categoryRank ? `Category: ${formatOrdinal(result.categoryRank)}` : "Verified Standing"}
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-white border border-[#E6E9EE] flex flex-col justify-between">
                <span className="text-xs text-[#737B85] font-medium uppercase tracking-wider">
                  Competition Status
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-heading text-2xl font-bold text-[#183153]">
                    Certified Candidate
                  </span>
                </div>
                <span className="text-[11px] text-[#737B85] mt-1">
                  {categoryInfo.title}
                </span>
              </div>
            )}
          </div>

          {/* Subject Breakdown (Controlled by fieldVisibility.showSubjectBreakdown) */}
          {visibility.showSubjectBreakdown && result.subjectScores && result.subjectScores.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#737B85]">
                Subject-wise Performance Breakdown
              </h4>
              <div className="overflow-x-auto border border-[#E6E9EE] rounded-lg">
                <table className="min-w-full divide-y divide-[#E6E9EE] text-left text-xs">
                  <thead className="bg-[#F7F8FA] font-semibold text-[#20252B]">
                    <tr>
                      <th className="px-3.5 py-2.5">Subject / Assessment Area</th>
                      <th className="px-3.5 py-2.5 text-right">Max Marks</th>
                      <th className="px-3.5 py-2.5 text-right">Marks Obtained</th>
                      <th className="px-3.5 py-2.5 text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E9EE] text-[#20252B] bg-white">
                    {result.subjectScores.map((sub, idx) => {
                      const pct = Math.round((sub.obtained / sub.total) * 100);
                      return (
                        <tr key={idx} className="hover:bg-[#F7F8FA]/60">
                          <td className="px-3.5 py-2 font-medium">{sub.name}</td>
                          <td className="px-3.5 py-2 text-right text-[#737B85]">{sub.total}</td>
                          <td className="px-3.5 py-2 text-right font-semibold text-[#183153]">{sub.obtained}</td>
                          <td className="px-3.5 py-2 text-right font-mono text-[#737B85]">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Official Remarks (if provided) */}
          {result.remarks && (
            <div className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E6E9EE] text-xs text-[#20252B]">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-[#737B85] block mb-0.5">
                Examination Committee Remarks:
              </span>
              <p className="italic text-[#737B85]">{result.remarks}</p>
            </div>
          )}

          {/* Verification & Certification Footer */}
          <div className="pt-4 border-t border-[#E6E9EE] grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#183153] font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{cardLabels.remarksTitle || "Verified by Triple E Examination Committee"}</span>
              </div>
              <p className="text-[11px] text-[#737B85]">
                Official certified result record for {branding.competitionTitle}.
              </p>
            </div>

            <div className="text-left sm:text-right pt-2 sm:pt-0">
              <div className="inline-block border-t border-slate-300 pt-1 text-center min-w-[160px]">
                <p className="font-heading text-xs font-semibold text-[#183153]">
                  {cardLabels.controllerTitle || "Controller of Examinations"}
                </p>
                <p className="text-[10px] text-[#737B85]">
                  Triple E Organization • District Ghanche
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Excluded from print) */}
      <div className="no-print flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#183153] hover:bg-[#12243d] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
        >
          <Printer className="w-4 h-4 text-white" />
          <span>Print / Save as PDF</span>
        </button>

        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#20252B] font-medium text-xs sm:text-sm border border-[#E6E9EE] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#737B85]" />
            <span>Search Another Roll Number</span>
          </button>
        )}
      </div>
    </div>
  );
}
