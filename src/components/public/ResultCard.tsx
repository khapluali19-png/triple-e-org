"use client";

import Image from "next/image";
import { Printer, RotateCcw } from "lucide-react";
import { StudentResult, WebsiteBrandingConfig } from "@/lib/types";
import { DEFAULT_BRANDING, getLevelDescription } from "@/lib/constants";

interface ResultCardProps {
  result: StudentResult;
  onReset?: () => void;
  branding?: WebsiteBrandingConfig;
}

/**
 * Geometric corner ribbon banner matching the reference design:
 * - Solid dark green corner triangle
 * - Dark navy diagonal stripe
 * - Red diagonal stripe
 * - Inner green triangular accents connecting to the border frame
 */
function CertificateCorner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer corner dark green triangle */}
      <polygon points="0,0 88,0 0,88" fill="#065A36" />

      {/* Navy blue diagonal stripe */}
      <polygon points="0,90 90,0 108,0 0,108" fill="#0E2A47" />

      {/* Red accent diagonal stripe */}
      <polygon points="0,114 114,0 126,0 0,126" fill="#C52222" />

      {/* Inner green triangular accents */}
      <polygon points="0,132 0,154 22,132" fill="#065A36" />
      <polygon points="132,0 154,0 132,22" fill="#065A36" />
    </svg>
  );
}

/**
 * Soft sage-green botanical laurel leaves for outer left and right margins
 */
function SideLeaves({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 90 280"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15 270C15 235 42 215 62 195C62 225 38 255 15 270Z"
        fill="#A3C5B0"
        fillOpacity="0.45"
      />
      <path
        d="M38 215C38 180 68 160 88 135C82 170 58 200 38 215Z"
        fill="#A3C5B0"
        fillOpacity="0.38"
      />
      <path
        d="M12 165C12 130 42 110 65 90C60 125 35 155 12 165Z"
        fill="#A3C5B0"
        fillOpacity="0.45"
      />
      <path
        d="M32 105C32 70 62 50 82 25C76 60 52 95 32 105Z"
        fill="#A3C5B0"
        fillOpacity="0.38"
      />
    </svg>
  );
}

/**
 * 3-Leaf emerald green motif below mission statement
 */
function CenterLeafMotif({ className = "" }: { className?: string }) {
  return (
    <svg
      width="44"
      height="18"
      viewBox="0 0 44 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Center upright leaf */}
      <path
        d="M22 17C19 10 18 5 22 1C26 5 25 10 22 17Z"
        fill="#0D7B54"
      />
      {/* Left curving leaf */}
      <path
        d="M22 17C17 13 11 10 7 11C9 6 16 8 22 17Z"
        fill="#0D7B54"
      />
      {/* Right curving leaf */}
      <path
        d="M22 17C27 13 33 10 37 11C35 6 28 8 22 17Z"
        fill="#0D7B54"
      />
    </svg>
  );
}

function getGradeDescriptor(grade?: string): string {
  if (!grade) return "";
  const g = grade.trim().toUpperCase();
  if (g === "A+") return " — Outstanding";
  if (g === "A") return " — Excellent";
  if (g === "B") return " — Very Good";
  if (g === "C") return " — Good";
  if (g === "D") return " — Pass";
  return "";
}

function getCleanClassRange(level?: string, rawDesc?: string): string {
  const desc = rawDesc || getLevelDescription(level);
  if (!desc) return "";
  return desc.replace(/^classes\s+/i, "");
}

function getAchievementStatement(result: StudentResult): string {
  if (result.awardStatus) {
    if (
      result.awardStatus === "Winner" || 
      result.awardStatus === "1st Runner Up" || 
      result.awardStatus === "2nd Runner Up"
    ) {
      return `For achieving ${result.awardStatus} in the 2nd Quiz Competition`;
    }
    if (result.awardStatus === "High Distinction") {
      return "For achieving High Distinction in the 2nd Quiz Competition";
    }
    if (result.awardStatus === "Distinction") {
      return "For achieving Distinction in the 2nd Quiz Competition";
    }
  }

  if (result.grade === "A+" || (result.percentage !== undefined && result.percentage >= 90)) {
    return "For achieving High Distinction in the 2nd Quiz Competition";
  }

  if (result.grade === "A" || (result.percentage !== undefined && result.percentage >= 75)) {
    return "For achieving Distinction in the 2nd Quiz Competition";
  }

  if (result.grade === "B" || (result.percentage !== undefined && result.percentage >= 65)) {
    return "For achieving Merit Standing in the 2nd Quiz Competition";
  }

  if (result.passFailStatus === "Passed" || (result.percentage !== undefined && result.percentage >= 50)) {
    return "For successfully qualifying in the 2nd Quiz Competition";
  }

  return "For participating in the 2nd Quiz Competition";
}

export default function ResultCard({ 
  result, 
  onReset, 
  branding = DEFAULT_BRANDING 
}: ResultCardProps) {
  const classRange = getCleanClassRange(result.level, result.levelDescription);
  const achievementStatement = getAchievementStatement(result);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-center">
      {/* Printable Certificate Canvas (Exact Landscape A4 Single Page Ratio: 297mm x 210mm) */}
      <div 
        className="certificate-print-root relative w-full bg-white text-[#0E2A47] p-5 sm:p-9 md:p-12 shadow-2xl transition-all overflow-hidden border border-slate-200"
        style={{
          boxShadow: "0 20px 45px -15px rgba(14, 42, 71, 0.2), 0 0 0 1px rgba(14, 42, 71, 0.05)",
        }}
      >
        {/* Thin Green Perimeter Border (Inset 18-22px from all sides) */}
        <div className="absolute inset-[14px] sm:inset-[18px] md:inset-[22px] border-[1.5px] border-[#0D7B54] pointer-events-none z-0" />

        {/* 4 Geometric Corner Ribbon Banners */}
        <CertificateCorner className="absolute top-0 left-0 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 z-10 pointer-events-none select-none" />
        <CertificateCorner className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 scale-x-[-1] z-10 pointer-events-none select-none" />
        <CertificateCorner className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 scale-y-[-1] z-10 pointer-events-none select-none" />
        <CertificateCorner className="absolute bottom-0 right-0 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 scale-x-[-1] scale-y-[-1] z-10 pointer-events-none select-none" />

        {/* Soft Sage-Green Botanical Laurel Leaves along Left and Right Margins */}
        <SideLeaves className="absolute left-4 sm:left-6 md:left-8 top-1/2 -translate-y-1/2 w-14 sm:w-18 md:w-22 h-auto pointer-events-none select-none z-0" />
        <SideLeaves className="absolute right-4 sm:right-6 md:right-8 top-1/2 -translate-y-1/2 w-14 sm:w-18 md:w-22 h-auto scale-x-[-1] pointer-events-none select-none z-0" />

        {/* Certificate Content (Z-Index above borders & leaves) */}
        <div className="relative z-10 flex flex-col justify-between max-w-4xl mx-auto py-2 sm:py-3">
          {/* ======================================================== */}
          {/* A. Top Organization Logo                                 */}
          {/* ======================================================== */}
          <div className="flex flex-col items-center justify-center mb-2 sm:mb-3">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">
              <Image
                src={branding.logoUrl || "/images/logos/triple-e-logo.jpg"}
                alt={branding.organizationName || "Triple E Organization"}
                fill
                sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* B. Main Certificate Heading                              */}
          {/* ======================================================== */}
          <div className="space-y-1 mb-2 sm:mb-3">
            <h1 
              className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-[0.08em] sm:tracking-[0.11em] text-[#0E2A47] uppercase leading-none"
              style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif" }}
            >
              Certificate
            </h1>

            <div className="flex items-center justify-center gap-3 sm:gap-6 pt-1 sm:pt-2">
              <div className="h-[1.5px] w-14 sm:w-24 md:w-36 bg-[#0D7B54]" />
              <span 
                className="font-serif text-xs sm:text-base md:text-lg font-bold tracking-[0.25em] sm:tracking-[0.32em] text-[#0E2A47] uppercase"
                style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif" }}
              >
                Of Achievement
              </span>
              <div className="h-[1.5px] w-14 sm:w-24 md:w-36 bg-[#0D7B54]" />
            </div>
          </div>

          {/* ======================================================== */}
          {/* C. Competition Information                               */}
          {/* ======================================================== */}
          <div className="space-y-0.5 sm:space-y-1 mb-2">
            <p className="font-serif text-xs sm:text-sm md:text-base font-bold text-[#0E2A47] tracking-wide">
              {branding.competitionEdition || "2nd Quiz Competition"} • District Ghanche, Gilgit-Baltistan
            </p>
            <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-[#0D7B54] tracking-[0.14em] uppercase">
              Education • Empowerment • Environment
            </p>
            <div className="pt-1 flex justify-center">
              <CenterLeafMotif />
            </div>
          </div>

          {/* ======================================================== */}
          {/* D. Student Presentation                                  */}
          {/* ======================================================== */}
          <div className="space-y-1 sm:space-y-1.5 my-2 max-w-3xl mx-auto">
            <p className="text-[10px] sm:text-xs tracking-[0.22em] uppercase font-bold text-[#0E2A47]">
              This Certificate Is Proudly Presented To
            </p>

            <div className="py-0.5">
              <h2 
                className="font-serif text-3xl sm:text-4xl md:text-5xl font-black tracking-wide text-[#0E2A47] uppercase leading-tight"
                style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif" }}
              >
                {result.studentName}
              </h2>
            </div>

            {result.fatherName && result.fatherName.trim() && (
              <p className="font-serif text-sm sm:text-base text-[#0E2A47]">
                Father: <span className="font-semibold">{result.fatherName.trim()}</span>
              </p>
            )}

            {/* Thin green divider below student information */}
            <div className="w-40 sm:w-56 md:w-72 h-[1.5px] bg-[#0D7B54] mx-auto mt-2" />
          </div>

          {/* ======================================================== */}
          {/* E. Achievement Statement                                 */}
          {/* ======================================================== */}
          <div className="max-w-2xl mx-auto my-1.5 sm:my-2 px-4">
            <p className="font-serif text-xs sm:text-sm md:text-base font-semibold text-[#0E2A47] leading-relaxed">
              {achievementStatement}
            </p>
          </div>

          {/* ======================================================== */}
          {/* F. Two-Column Result Information Section                 */}
          {/* ======================================================== */}
          <div className="max-w-2xl sm:max-w-3xl mx-auto my-3 sm:my-4 px-4 sm:px-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 sm:gap-x-12 gap-y-1.5 relative text-xs sm:text-sm text-left">
              {/* LEFT COLUMN: Performance & Evaluation */}
              <div className="space-y-1.5">
                {result.obtainedMarks !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0E2A47]">Marks Scored:</span>
                    <span className="font-semibold text-[#0E2A47] font-mono">
                      {result.obtainedMarks}{result.totalMarks !== undefined ? ` / ${result.totalMarks}` : ""}
                    </span>
                  </div>
                )}

                {result.percentage !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0E2A47]">Percentage:</span>
                    <span className="font-semibold text-[#0E2A47] font-mono">{result.percentage}%</span>
                  </div>
                )}

                {result.grade && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0E2A47]">Official Grade:</span>
                    <span className="font-bold text-[#0E2A47]">
                      {result.grade}{getGradeDescriptor(result.grade)}
                    </span>
                  </div>
                )}

                {result.level && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0E2A47]">Competition Level:</span>
                    <span className="font-semibold text-[#0E2A47]">{result.level}</span>
                  </div>
                )}

                {classRange && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0E2A47]">Classes:</span>
                    <span className="font-semibold text-[#0E2A47]">{classRange}</span>
                  </div>
                )}
              </div>

              {/* Center Thin Green Vertical Line (Desktop) */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-[#0D7B54] -translate-x-1/2" />

              {/* RIGHT COLUMN: Examination Center & Institutional Details */}
              <div className="space-y-1.5">
                {result.examinationCenter && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0E2A47]">Examination Center:</span>
                    <span className="font-semibold text-[#0E2A47]">{result.examinationCenter}</span>
                  </div>
                )}

                {result.schoolName && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0E2A47]">Institution / School:</span>
                    <span 
                      className="font-semibold text-[#0E2A47] truncate max-w-[170px] sm:max-w-[220px]" 
                      title={result.schoolName}
                    >
                      {result.schoolName}
                    </span>
                  </div>
                )}

                {result.classOrSection && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0E2A47]">Class:</span>
                    <span className="font-semibold text-[#0E2A47]">{result.classOrSection}</span>
                  </div>
                )}

                {result.rollNumber && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0E2A47]">Roll No:</span>
                    <span className="font-mono font-semibold text-[#0E2A47]">
                      {result.rollNumber.startsWith("#") ? result.rollNumber : `#${result.rollNumber}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* G & H: Verification Footer & Official Sponsorship        */}
          {/* ======================================================== */}
          <div className="pt-4 sm:pt-6 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-center">
            {/* LEFT: Examination Committee */}
            <div className="order-2 md:order-1 space-y-1">
              <div className="w-48 sm:w-56 h-[1.5px] bg-[#0E2A47] mx-auto mb-1.5" />
              <p className="font-serif text-[10px] sm:text-[11px] font-bold text-[#0E2A47]">
                Verified by Triple-E Examination Committee
              </p>
            </div>

            {/* CENTER: Official Sponsorship by Siachen Mark Marketing Agency */}
            <div className="order-1 md:order-2 space-y-1 pb-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="h-[1px] w-8 sm:w-10 bg-[#0D7B54]" />
                <span className="text-[10px] sm:text-[11px] font-semibold text-[#0E2A47] tracking-wide">
                  Official Sponsorship by
                </span>
                <div className="h-[1px] w-8 sm:w-10 bg-[#0D7B54]" />
              </div>
              <a
                href="https://siachen-mark.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-transform hover:scale-105"
                title="Siachen Mark Marketing Agency"
              >
                <div className="relative w-32 sm:w-36 h-9 sm:h-10 mx-auto">
                  <Image
                    src="/images/logos/siachen-mark-logo.jpg"
                    alt="Siachen Mark Marketing Agency"
                    fill
                    sizes="(max-width: 640px) 128px, 144px"
                    className="object-contain"
                  />
                </div>
              </a>
            </div>

            {/* RIGHT: Controller of Examinations */}
            <div className="order-3 space-y-0.5">
              <div className="w-48 sm:w-56 h-[1.5px] bg-[#0E2A47] mx-auto mb-1.5" />
              <p className="font-serif text-[10px] sm:text-[11px] font-bold text-[#0E2A47] leading-tight">
                Controller of Examinations • Triple E Organization,
              </p>
              <p className="font-serif text-[10px] sm:text-[11px] font-bold text-[#0E2A47] leading-tight">
                District Ghanche
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Excluded from Print) */}
      <div className="no-print flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0E2A47] hover:bg-[#16385d] text-white font-semibold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          <Printer className="w-4 h-4 text-white" />
          <span>Print / Save as PDF</span>
        </button>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#0E2A47] font-semibold text-xs sm:text-sm border border-[#0E2A47]/20 transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#4B5E76]" />
            <span>Search Another Result</span>
          </button>
        )}
      </div>
    </div>
  );
}
