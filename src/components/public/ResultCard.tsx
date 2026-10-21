"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Download, RotateCcw, Loader2 } from "lucide-react";
import { toJpeg } from "html-to-image";
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

  if (result.percentage !== undefined && result.percentage >= 50) {
    return "For successfully qualifying in the 2nd Quiz Competition";
  }

  return "For participating in the 2nd Quiz Competition";
}

export default function ResultCard({ 
  result, 
  onReset, 
  branding = DEFAULT_BRANDING 
}: ResultCardProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const classRange = getCleanClassRange(result.level, result.levelDescription);
  const achievementStatement = getAchievementStatement(result);

  const handleDownloadJpg = async () => {
    if (typeof window === "undefined" || !certificateRef.current) return;

    let container: HTMLDivElement | null = null;
    try {
      setDownloading(true);
      const cardEl = certificateRef.current;

      // 1. Ensure all live certificate images are loaded & decoded
      const images = Array.from(cardEl.querySelectorAll("img")) as HTMLImageElement[];
      await Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalWidth > 0) {
            if ("decode" in img) {
              return img.decode().catch(() => {});
            }
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            img.onload = () => {
              if ("decode" in img) {
                img.decode().then(resolve).catch(() => resolve());
              } else {
                resolve();
              }
            };
            img.onerror = () => resolve();
          });
        })
      );

      // 2. Ensure web fonts are fully rendered
      if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 3. Prepare an offscreen fixed-dimension A4 Landscape container
      // A4 Landscape standard: 297mm x 210mm (at 96 DPI: 1122.5px x 793.7px)
      // Capturing from this container guarantees identical, authentic PC A4 Landscape format
      // on mobile phones, tablets, and desktop computers alike.
      const targetCanvasWidth = 1122.5;
      const targetCanvasHeight = 793.7;

      container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "0";
      container.style.top = "0";
      container.style.width = `${targetCanvasWidth}px`;
      container.style.height = `${targetCanvasHeight}px`;
      container.style.zIndex = "-99999";
      container.style.overflow = "hidden";
      container.style.pointerEvents = "none";
      container.style.opacity = "0.01";
      container.style.backgroundColor = "#ffffff";

      const clone = cardEl.cloneNode(true) as HTMLElement;
      clone.classList.add("a4-landscape-export");
      container.appendChild(clone);
      document.body.appendChild(container);

      // Wait a frame for browser layout and styles to calculate on the mounted clone
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));

      // 4. Ensure images inside the clone are decoded
      const cloneImages = Array.from(clone.querySelectorAll("img")) as HTMLImageElement[];
      await Promise.all(
        cloneImages.map((img) => {
          if (img.complete && img.naturalWidth > 0) {
            if ("decode" in img) {
              return img.decode().catch(() => {});
            }
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            img.onload = () => {
              if ("decode" in img) {
                img.decode().then(resolve).catch(() => resolve());
              } else {
                resolve();
              }
            };
            img.onerror = () => resolve();
          });
        })
      );

      // 5. Convert to high-resolution JPEG (300 DPI A4 Landscape: 3508px x 2480px)
      // 1122.5 * 3.125 = 3507.8px ≈ 3508px
      // 793.7 * 3.125 = 2480.3px ≈ 2480px
      const pixelRatio = 3.125;

      const dataUrl = await toJpeg(clone, {
        quality: 0.98,
        pixelRatio,
        width: targetCanvasWidth,
        height: targetCanvasHeight,
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: {
          boxShadow: "none",
          margin: "0",
          transform: "none",
        },
      });

      // 6. Convert to Blob URL for fast and universally supported download across mobile browsers (iOS/Android)
      const sanitizedName = (result.studentName || "Student")
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const filename = `Triple-E-Certificate-${sanitizedName || "Student"}.jpg`;

      // Helper to convert base64 to Blob
      const arr = dataUrl.split(",");
      const mime = arr[0].match(/:(.*?);/)![1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.download = filename;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 300);
    } catch (err) {
      console.error("Failed to generate JPG certificate:", err);
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
      setDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-center">
      {/* Printable / Exportable Certificate Canvas (Landscape A4 Single Page Ratio: 297mm x 210mm) */}
      <div 
        ref={certificateRef}
        className="certificate-print-root relative w-full bg-white text-[#0E2A47] p-5 sm:p-8 md:p-10 shadow-2xl transition-all border border-slate-200"
        style={{
          boxShadow: "0 20px 45px -15px rgba(14, 42, 71, 0.2), 0 0 0 1px rgba(14, 42, 71, 0.05)",
        }}
      >
        {/* Thin Green Perimeter Border (Inset 14-20px from all sides) */}
        <div className="cert-perimeter-border absolute inset-[12px] sm:inset-[16px] md:inset-[20px] border-[1.5px] border-[#0D7B54] pointer-events-none z-0" />

        {/* 4 Geometric Corner Ribbon Banners */}
        <CertificateCorner className="cert-corner cert-corner-tl absolute top-0 left-0 w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 z-5 pointer-events-none select-none" />
        <CertificateCorner className="cert-corner cert-corner-tr absolute top-0 right-0 w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 scale-x-[-1] z-5 pointer-events-none select-none" />
        <CertificateCorner className="cert-corner cert-corner-bl absolute bottom-0 left-0 w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 scale-y-[-1] z-5 pointer-events-none select-none" />
        <CertificateCorner className="cert-corner cert-corner-br absolute bottom-0 right-0 w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 scale-x-[-1] scale-y-[-1] z-5 pointer-events-none select-none" />

        {/* Soft Sage-Green Botanical Laurel Leaves along Left and Right Margins */}
        <SideLeaves className="cert-leaves cert-leaves-l absolute left-3 sm:left-5 md:left-7 top-1/2 -translate-y-1/2 w-12 sm:w-16 md:w-20 h-auto pointer-events-none select-none z-0" />
        <SideLeaves className="cert-leaves cert-leaves-r absolute right-3 sm:right-5 md:right-7 top-1/2 -translate-y-1/2 w-12 sm:w-16 md:w-20 h-auto scale-x-[-1] pointer-events-none select-none z-0" />

        {/* Certificate Content (Z-Index above borders & leaves) */}
        <div className="certificate-inner-content relative z-10 w-full h-full flex flex-col justify-between max-w-4xl mx-auto py-1 sm:py-2">
          {/* ======================================================== */}
          {/* 1. TOP BRANDING & COMPETITION HEADING                    */}
          {/* ======================================================== */}
          <div className="cert-section-top flex flex-col items-center justify-center text-center">
            {/* Organization Logo */}
            <div className="cert-logo-container relative w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 mx-auto mb-1.5 sm:mb-2">
              <Image
                src={branding.logoUrl || "/images/logos/triple-e-logo.jpg"}
                alt={branding.organizationName || "Triple E Organization"}
                fill
                sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>

            {/* Main Heading */}
            <h1 
              className="cert-main-title font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-[0.08em] sm:tracking-[0.1em] text-[#0E2A47] uppercase leading-none"
              style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif" }}
            >
              Certificate
            </h1>

            {/* Flanked OF ACHIEVEMENT */}
            <div className="cert-sub-title-wrapper flex items-center justify-center gap-3 sm:gap-5 pt-1">
              <div className="cert-sub-title-line h-[1.5px] w-12 sm:w-20 md:w-28 bg-[#0D7B54]" />
              <span 
                className="cert-sub-title-text font-serif text-xs sm:text-sm md:text-base font-bold tracking-[0.25em] sm:tracking-[0.3em] text-[#0E2A47] uppercase"
                style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif" }}
              >
                Of Achievement
              </span>
              <div className="cert-sub-title-line h-[1.5px] w-12 sm:w-20 md:w-28 bg-[#0D7B54]" />
            </div>

            {/* Competition Details */}
            <p className="cert-competition-title font-serif text-xs sm:text-sm font-bold text-[#0E2A47] tracking-wide mt-1">
              {branding.competitionEdition || "2nd Quiz Competition"} • District {result.district || "Ghanche"}, Gilgit-Baltistan
            </p>
            <p className="cert-motto-text text-[10px] sm:text-xs font-semibold text-[#0D7B54] tracking-[0.14em] uppercase mt-0.5">
              Education • Empowerment • Environment
            </p>
            <div className="cert-leaf-motif pt-0.5 sm:pt-1 flex justify-center">
              <CenterLeafMotif />
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. STUDENT PRESENTATION & IDENTITY                       */}
          {/* ======================================================== */}
          <div className="cert-section-student text-center max-w-3xl mx-auto my-1.5 sm:my-2 w-full">
            <p className="cert-presented-to text-[10px] sm:text-xs tracking-[0.22em] uppercase font-bold text-[#0E2A47] mb-1">
              This Certificate Is Proudly Presented To
            </p>

            <h2 
              className="cert-student-name font-serif text-2xl sm:text-3xl md:text-4xl font-black tracking-wide text-[#0E2A47] uppercase leading-tight my-1 break-words max-w-xl mx-auto"
              style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, Cambria, 'Times New Roman', serif" }}
            >
              {result.studentName}
            </h2>

            {result.fatherName && result.fatherName.trim() && (
              <p className="cert-father-name font-serif text-xs sm:text-sm md:text-base text-[#0E2A47] my-0.5">
                Father: <span className="font-semibold">{result.fatherName.trim()}</span>
              </p>
            )}

            {/* Thin green divider below student information */}
            <div className="cert-student-divider w-36 sm:w-48 md:w-64 h-[1.5px] bg-[#0D7B54] mx-auto my-1.5" />

            {/* Achievement Statement */}
            <p className="cert-achievement-statement font-serif text-xs sm:text-sm font-semibold text-[#0E2A47] leading-relaxed max-w-2xl mx-auto px-4 mt-1">
              {achievementStatement}
            </p>
          </div>

          {/* ======================================================== */}
          {/* 3. TWO-COLUMN RESULT DETAILS (CENTERED DIVIDER)          */}
          {/* ======================================================== */}
          <div className="cert-section-results max-w-2xl sm:max-w-3xl mx-auto my-2 sm:my-3 px-4 sm:px-6 w-full">
            <div className="cert-results-grid grid grid-cols-1 md:grid-cols-2 gap-x-8 sm:gap-x-12 gap-y-1 relative text-xs sm:text-sm text-left">
              {/* LEFT COLUMN: Performance & Evaluation */}
              <div className="cert-col-left space-y-1">
                {result.obtainedMarks !== undefined && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Marks Scored:</span>
                    <span className="cert-result-value font-semibold text-[#0E2A47] font-mono">
                      {result.obtainedMarks}{result.totalMarks !== undefined ? ` / ${result.totalMarks}` : ""}
                    </span>
                  </div>
                )}

                {result.percentage !== undefined && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Percentage:</span>
                    <span className="cert-result-value font-semibold text-[#0E2A47] font-mono">{result.percentage}%</span>
                  </div>
                )}

                {result.grade && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Official Grade:</span>
                    <span className="cert-result-value font-bold text-[#0E2A47]">
                      {result.grade}{getGradeDescriptor(result.grade)}
                    </span>
                  </div>
                )}

                {result.level && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Competition Level:</span>
                    <span className="cert-result-value font-semibold text-[#0E2A47]">{result.level}</span>
                  </div>
                )}

                {classRange && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Classes:</span>
                    <span className="cert-result-value font-semibold text-[#0E2A47]">{classRange}</span>
                  </div>
                )}

                {result.rank !== undefined && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Position / Rank:</span>
                    <span className="cert-result-value font-bold text-[#065A36]">#{result.rank}</span>
                  </div>
                )}

                {result.awardStatus && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Standing:</span>
                    <span className="cert-result-value font-bold text-[#065A36]">{result.awardStatus}</span>
                  </div>
                )}

              </div>

              {/* Center Thin Green Vertical Line (Desktop/Print) */}
              <div className="cert-results-divider hidden md:block absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-[#0D7B54] -translate-x-1/2" />

              {/* RIGHT COLUMN: Examination Center & Institutional Details */}
              <div className="cert-col-right space-y-1">
                {result.examinationCenter && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Examination Center:</span>
                    <span className="cert-result-value font-semibold text-[#0E2A47]">{result.examinationCenter}</span>
                  </div>
                )}

                {result.schoolName && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Institution / School:</span>
                    <span 
                      className="cert-result-value font-semibold text-[#0E2A47] truncate max-w-[170px] sm:max-w-[220px]" 
                      title={result.schoolName}
                    >
                      {result.schoolName}
                    </span>
                  </div>
                )}

                {result.classOrSection && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Class:</span>
                    <span className="cert-result-value font-semibold text-[#0E2A47]">{result.classOrSection}</span>
                  </div>
                )}

                {result.rollNumber && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Roll No:</span>
                    <span className="cert-result-value font-mono font-semibold text-[#0E2A47]">
                      {result.rollNumber.startsWith("#") ? result.rollNumber : `#${result.rollNumber}`}
                    </span>
                  </div>
                )}

                {result.tehsil && (
                  <div className="cert-result-row flex items-center justify-between">
                    <span className="cert-result-label font-bold text-[#0E2A47]">Tehsil:</span>
                    <span className="cert-result-value font-semibold text-[#0E2A47]">{result.tehsil}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Subject-Wise Breakdown (if present in examination record) */}
            {result.subjectScores && result.subjectScores.length > 0 && (
              <div className="cert-subject-scores max-w-2xl mx-auto my-1 px-4 text-center">
                <div className="flex flex-wrap justify-center gap-2 text-[11px] text-[#0E2A47]">
                  {result.subjectScores.map((subj, idx) => (
                    <span key={idx} className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <span className="font-semibold">{subj.name}:</span> {subj.obtained}/{subj.total}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Official Remarks (if present in examination record) */}
            {result.remarks && (
              <div className="cert-remarks max-w-2xl mx-auto my-1 px-4 text-center">
                <p className="text-[11px] text-[#0E2A47] italic">
                  <span className="font-bold not-italic">Remarks:</span> {result.remarks}
                </p>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 4. VERIFICATION FOOTER & OFFICIAL SPONSORSHIP            */}
          {/* ======================================================== */}
          <div className="cert-section-footer pt-3 sm:pt-5 mt-auto grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-end text-center w-full">
            {/* LEFT: Examination Committee */}
            <div className="cert-footer-left order-2 md:order-1 space-y-1">
              <div className="cert-signature-line w-44 sm:w-52 h-[1.5px] bg-[#0E2A47] mx-auto mb-1" />
              <p className="cert-signature-text font-serif text-[10px] sm:text-[11px] font-bold text-[#0E2A47]">
                Verified by Triple-E Examination Committee
              </p>
            </div>

            {/* CENTER: Official Sponsorship by Siachen Mark Marketing Agency */}
            <div className="cert-sponsor-wrapper order-1 md:order-2 space-y-1 pb-1">
              <div className="cert-sponsor-label-row flex items-center justify-center gap-2 mb-1">
                <div className="cert-sponsor-line h-[1px] w-6 sm:w-8 bg-[#0D7B54]" />
                <span className="cert-sponsor-label text-[10px] sm:text-[11px] font-semibold text-[#0E2A47] tracking-wide">
                  Official Sponsorship by
                </span>
                <div className="cert-sponsor-line h-[1px] w-6 sm:w-8 bg-[#0D7B54]" />
              </div>
              <a
                href="https://siachen-mark.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-transform hover:scale-105"
                title="Siachen Mark Marketing Agency"
              >
                <div className="cert-sponsor-logo-box relative w-28 sm:w-32 md:w-36 h-8 sm:h-9 md:h-10 mx-auto">
                  <Image
                    src="/images/logos/siachen-mark-logo.jpg"
                    alt="Siachen Mark Marketing Agency"
                    fill
                    sizes="(max-width: 640px) 112px, 144px"
                    className="object-contain"
                    priority
                    unoptimized
                  />
                </div>
              </a>
            </div>

            {/* RIGHT: Controller of Examinations */}
            <div className="cert-footer-right order-3 space-y-0.5">
              <div className="cert-signature-line w-44 sm:w-52 h-[1.5px] bg-[#0E2A47] mx-auto mb-1" />
              <p className="cert-signature-text font-serif text-[10px] sm:text-[11px] font-bold text-[#0E2A47] leading-tight">
                Controller of Examinations • Triple E Organization,
              </p>
              <p className="cert-signature-text font-serif text-[10px] sm:text-[11px] font-bold text-[#0E2A47] leading-tight">
                District Ghanche
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (JPG Download & Search Reset) */}
      <div className="no-print flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownloadJpg}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0E2A47] hover:bg-[#16385d] disabled:bg-slate-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Generating High-Res JPG...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-white" />
              <span>Download Certificate (JPG)</span>
            </>
          )}
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
