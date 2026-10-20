"use client";

import Image from "next/image";
import { 
  Printer, 
  RotateCcw 
} from "lucide-react";
import { StudentResult, WebsiteBrandingConfig } from "@/lib/types";
import { DEFAULT_BRANDING, getLevelDescription } from "@/lib/constants";

interface ResultCardProps {
  result: StudentResult;
  onReset?: () => void;
  branding?: WebsiteBrandingConfig;
}

/**
 * Classical Botanical & Filigree Corner Ornament
 * Uses deep navy outer framing, emerald green botanical leaves, and ruby red accent gemstones.
 */
function CertificateCorner({ className = "" }: { className?: string }) {
  return (
    <svg
      width="76"
      height="76"
      viewBox="0 0 76 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer corner framing lines */}
      <path d="M2 38V2H38" stroke="#0E2A47" strokeWidth="2.5" strokeLinecap="square" />
      <path d="M7 30V7H30" stroke="#0D7B54" strokeWidth="1.2" strokeLinecap="square" />
      <path d="M11 22V11H22" stroke="#0E2A47" strokeWidth="0.8" strokeLinecap="square" />

      {/* Diagonal filigree connecting lines */}
      <path d="M2 2L16 16" stroke="#0E2A47" strokeWidth="1" strokeLinecap="round" />
      <path d="M7 7L22 22" stroke="#0D7B54" strokeWidth="0.75" strokeLinecap="round" />

      {/* Botanical leaves curling outward */}
      <path
        d="M12 12C12 21 17 28 23 34C21 26 19 19 12 12Z"
        fill="#0D7B54"
        fillOpacity="0.9"
      />
      <path
        d="M12 12C21 12 28 17 34 23C26 21 19 19 12 12Z"
        fill="#0D7B54"
        fillOpacity="0.9"
      />
      <path
        d="M17 17C17 24 21 29 26 33C24 27 22 22 17 17Z"
        fill="#168B46"
        fillOpacity="0.75"
      />
      <path
        d="M17 17C24 17 29 21 33 26C27 24 22 22 17 17Z"
        fill="#168B46"
        fillOpacity="0.75"
      />

      {/* Ruby red accent gemstone at corner pivot & tips */}
      <circle cx="12" cy="12" r="2.8" fill="#D62828" stroke="#0E2A47" strokeWidth="0.75" />
      <circle cx="30" cy="7" r="1.8" fill="#D62828" />
      <circle cx="7" cy="30" r="1.8" fill="#D62828" />
      <circle cx="22" cy="11" r="1.4" fill="#0D7B54" />
      <circle cx="11" cy="22" r="1.4" fill="#0D7B54" />
    </svg>
  );
}

/**
 * Botanical Leaf Divider with Center Accent
 */
function BotanicalDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      width="140"
      height="16"
      viewBox="0 0 140 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 8H52" stroke="#0D7B54" strokeWidth="1" strokeLinecap="round" />
      <path d="M88 8H140" stroke="#0D7B54" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M60 8C63 4 68 3 70 8C68 13 63 12 60 8Z"
        fill="#0D7B54"
      />
      <path
        d="M80 8C77 4 72 3 70 8C72 13 77 12 80 8Z"
        fill="#168B46"
      />
      <circle cx="70" cy="8" r="2" fill="#D62828" />
    </svg>
  );
}

/**
 * Computes formal achievement wording matching competition standards
 */
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
  const levelDesc = result.levelDescription || getLevelDescription(result.level);
  const achievementStatement = getAchievementStatement(result);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-center">
      {/* Printable Certificate Container (Landscape A4 proportion: 297mm x 210mm) */}
      <div 
        className="certificate-print-root relative w-full bg-[#FCFAF7] text-[#0E2A47] border-[3px] border-[#0E2A47] rounded-sm p-3 sm:p-4 md:p-5 shadow-2xl transition-all overflow-hidden"
        style={{
          boxShadow: "0 20px 40px -15px rgba(14, 42, 71, 0.15), 0 0 0 1px rgba(14, 42, 71, 0.08)",
        }}
      >
        {/* Subtle Watermark Texture / Leaf Emblem in Center */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.025] flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          <div className="w-[500px] h-[500px] rounded-full border-[16px] border-[#0E2A47] flex items-center justify-center">
            <span className="font-serif text-[120px] font-bold text-[#0E2A47]">EEE</span>
          </div>
        </div>

        {/* Inner Elegant Thin Double-Border with Margin Inset */}
        <div className="relative border border-[#0D7B54] p-5 sm:p-8 md:p-10 bg-[#FCFAF7]/95">
          {/* 4 Classical Corner Ornaments */}
          <CertificateCorner className="absolute top-1 left-1 sm:top-2 sm:left-2 pointer-events-none select-none" />
          <CertificateCorner className="absolute top-1 right-1 sm:top-2 sm:right-2 scale-x-[-1] pointer-events-none select-none" />
          <CertificateCorner className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 scale-y-[-1] pointer-events-none select-none" />
          <CertificateCorner className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 scale-x-[-1] scale-y-[-1] pointer-events-none select-none" />

          {/* ======================================================== */}
          {/* SECTION A: Top Organization Branding                     */}
          {/* ======================================================== */}
          <div className="flex flex-col items-center justify-center mb-4 sm:mb-5">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full p-1 bg-white border border-[#0D7B54]/30 shadow-xs">
              <Image
                src={branding.logoUrl || "/images/logos/triple-e-logo.jpg"}
                alt={branding.organizationName || "Triple E Organization"}
                fill
                sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
                className="object-contain p-1"
                priority
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION B: Main Certificate Heading                      */}
          {/* ======================================================== */}
          <div className="space-y-1 sm:space-y-1.5 mb-4 sm:mb-5">
            <h1 
              className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-[0.16em] sm:tracking-[0.2em] text-[#0E2A47] uppercase leading-none"
              style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif" }}
            >
              Certificate
            </h1>
            
            <div className="flex items-center justify-center gap-3 sm:gap-5 pt-1">
              <div className="h-[1.5px] w-12 sm:w-20 md:w-28 bg-[#0D7B54]" />
              <span 
                className="font-serif text-xs sm:text-sm md:text-base font-bold tracking-[0.28em] sm:tracking-[0.34em] text-[#0E2A47] uppercase"
                style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif" }}
              >
                Of Achievement
              </span>
              <div className="h-[1.5px] w-12 sm:w-20 md:w-28 bg-[#0D7B54]" />
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION C: Competition Information                       */}
          {/* ======================================================== */}
          <div className="space-y-1 mb-5 sm:mb-6">
            <p className="font-serif text-xs sm:text-sm md:text-base font-bold text-[#0E2A47] tracking-wider uppercase">
              {branding.competitionEdition || "2nd Quiz Competition"} • District Ghanche, Gilgit-Baltistan
            </p>
            <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-[#0D7B54] tracking-[0.18em] uppercase">
              Education • Empowerment • Environment
            </p>
          </div>

          <BotanicalDivider className="mx-auto mb-5 sm:mb-6" />

          {/* ======================================================== */}
          {/* SECTION D: Student Presentation                          */}
          {/* ======================================================== */}
          <div className="space-y-2 mb-4 sm:mb-5 max-w-3xl mx-auto">
            <p className="text-[10px] sm:text-xs tracking-[0.24em] uppercase font-bold text-[#4B5E76]">
              This Certificate Is Proudly Presented To
            </p>
            
            <div className="py-1">
              <h2 
                className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-wide text-[#0E2A47] uppercase leading-tight"
                style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif" }}
              >
                {result.studentName}
              </h2>
            </div>

            {result.fatherName && result.fatherName.trim() && (
              <p className="font-serif text-sm sm:text-base text-[#243E5E] italic">
                Father: <span className="font-bold not-italic text-[#0E2A47]">{result.fatherName.trim()}</span>
              </p>
            )}

            {/* Thin green divider below student information */}
            <div className="w-36 sm:w-48 md:w-64 h-[1.5px] bg-[#0D7B54] mx-auto mt-2" />
          </div>

          {/* ======================================================== */}
          {/* SECTION E: Achievement Statement                         */}
          {/* ======================================================== */}
          <div className="max-w-2xl mx-auto mb-6 px-4">
            <p className="font-serif text-xs sm:text-sm md:text-base text-[#183153] leading-relaxed italic">
              {achievementStatement}
            </p>
          </div>

          {/* ======================================================== */}
          {/* SECTION F: Result Information Section (2 Columns)        */}
          {/* ======================================================== */}
          <div className="max-w-3xl mx-auto my-6 px-4 sm:px-7 py-4 bg-[#FAF7F2]/90 rounded-md border border-[#0D7B54]/30 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 relative text-left">
              {/* LEFT COLUMN: Performance & Evaluation */}
              <div className="space-y-2 text-xs sm:text-sm">
                {result.obtainedMarks !== undefined && (
                  <div className="flex items-center justify-between border-b border-[#0D7B54]/15 pb-1">
                    <span className="text-[#4B5E76] font-semibold">Marks Scored:</span>
                    <span className="font-bold text-[#0E2A47] font-mono">
                      {result.obtainedMarks}{result.totalMarks !== undefined ? ` / ${result.totalMarks}` : ""}
                    </span>
                  </div>
                )}

                {result.percentage !== undefined && (
                  <div className="flex items-center justify-between border-b border-[#0D7B54]/15 pb-1">
                    <span className="text-[#4B5E76] font-semibold">Percentage:</span>
                    <span className="font-bold text-[#0E2A47] font-mono">{result.percentage}%</span>
                  </div>
                )}

                {result.grade && (
                  <div className="flex items-center justify-between border-b border-[#0D7B54]/15 pb-1">
                    <span className="text-[#4B5E76] font-semibold">Official Grade:</span>
                    <span className="font-serif font-black text-sm text-[#0D7B54]">{result.grade}</span>
                  </div>
                )}

                {result.level && (
                  <div className="flex items-center justify-between border-b border-[#0D7B54]/15 pb-1">
                    <span className="text-[#4B5E76] font-semibold">Competition Level:</span>
                    <span className="font-bold text-[#0E2A47]">{result.level}</span>
                  </div>
                )}

                {levelDesc && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5E76] font-semibold">Classes:</span>
                    <span className="font-medium text-[#0E2A47]">{levelDesc}</span>
                  </div>
                )}
              </div>

              {/* Center Thin Green Vertical Line (Desktop) */}
              <div className="hidden md:block absolute left-1/2 top-1 bottom-1 w-[1px] bg-[#0D7B54]/30 -translate-x-1/2" />

              {/* RIGHT COLUMN: Examination Center & Institutional Details */}
              <div className="space-y-2 text-xs sm:text-sm">
                {result.examinationCenter && (
                  <div className="flex items-center justify-between border-b border-[#0D7B54]/15 pb-1">
                    <span className="text-[#4B5E76] font-semibold">Examination Center:</span>
                    <span className="font-bold text-[#0E2A47]">{result.examinationCenter}</span>
                  </div>
                )}

                {result.schoolName && (
                  <div className="flex items-center justify-between border-b border-[#0D7B54]/15 pb-1">
                    <span className="text-[#4B5E76] font-semibold">Institution / School:</span>
                    <span 
                      className="font-semibold text-[#0E2A47] truncate max-w-[170px] sm:max-w-[220px]" 
                      title={result.schoolName}
                    >
                      {result.schoolName}
                    </span>
                  </div>
                )}

                {result.classOrSection && (
                  <div className="flex items-center justify-between border-b border-[#0D7B54]/15 pb-1">
                    <span className="text-[#4B5E76] font-semibold">Class:</span>
                    <span className="font-medium text-[#0E2A47]">{result.classOrSection}</span>
                  </div>
                )}

                {result.rollNumber && (
                  <div className="flex items-center justify-between border-b border-[#0D7B54]/15 pb-1">
                    <span className="text-[#4B5E76] font-semibold">Roll No:</span>
                    <span className="font-mono font-bold text-[#0E2A47]">{result.rollNumber}</span>
                  </div>
                )}

                {result.tehsil && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5E76] font-semibold">Tehsil:</span>
                    <span className="font-medium text-[#0E2A47]">{result.tehsil}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION G & H: Verification Footer & Official Sponsorship*/}
          {/* ======================================================== */}
          <div className="pt-6 sm:pt-8 mt-4 border-t border-[#0D7B54]/25 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* LEFT: Examination Committee Verification */}
            <div className="text-center order-2 md:order-1 space-y-1">
              <div className="w-36 sm:w-44 h-[1px] bg-[#0E2A47]/40 mx-auto mb-2" />
              <p className="font-serif text-[11px] sm:text-xs font-bold text-[#0E2A47] uppercase tracking-wider">
                Verified by Triple-E Examination Committee
              </p>
              <p className="text-[10px] text-[#4B5E76]">
                District Ghanche, Gilgit-Baltistan
              </p>
            </div>

            {/* CENTER: Official Sponsorship by Siachen Mark Marketing Agency */}
            <div className="text-center order-1 md:order-2 space-y-1.5 pb-1">
              <div className="w-12 h-[1.5px] bg-[#0D7B54] mx-auto mb-1" />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-[#4B5E76] font-bold block">
                Official Sponsorship by
              </span>
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
            <div className="text-center order-3 space-y-1">
              <div className="w-36 sm:w-44 h-[1px] bg-[#0E2A47]/40 mx-auto mb-2" />
              <p className="font-serif text-[11px] sm:text-xs font-bold text-[#0E2A47] uppercase tracking-wider">
                Controller of Examinations
              </p>
              <p className="text-[10px] text-[#4B5E76]">
                Triple E Organization • District Ghanche
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Excluded from Print) */}
      <div className="no-print flex flex-wrap items-center justify-center gap-3 pt-3">
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
