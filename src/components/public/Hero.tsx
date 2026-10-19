import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { DEFAULT_BRANDING } from "@/lib/constants";
import { WebsiteBrandingConfig } from "@/lib/types";

interface HeroProps {
  branding?: WebsiteBrandingConfig;
}

export default function Hero({ branding = DEFAULT_BRANDING }: HeroProps) {
  const headline = branding.mainHeadline || "Celebrating Knowledge.\nInspiring Young Minds.";
  const headlineLines = headline.split("\n");

  return (
    <section className="relative bg-white pt-12 pb-16 sm:pt-18 sm:pb-24 lg:pt-24 lg:pb-32 border-b border-[#E6E9EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Large Editorial Heading & Details */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Supporting Heading */}
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#183153]">
                {branding.organizationName}
              </p>
              <p className="text-xs sm:text-sm font-medium text-[#737B85]">
                {branding.competitionEdition} • {branding.organizationRegion}
              </p>
            </div>

            {/* Main Editorial Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-light text-[#183153] tracking-tight leading-[1.14]">
              {headlineLines.length > 1 ? (
                <>
                  <span>{headlineLines[0]}</span>
                  <br />
                  <span className="font-medium text-[#20252B]">{headlineLines.slice(1).join(" ")}</span>
                </>
              ) : (
                <span className="font-medium text-[#183153]">{headline}</span>
              )}
            </h1>

            {/* Initiative Description */}
            <p className="text-base sm:text-lg text-[#737B85] leading-relaxed max-w-xl font-normal">
              {branding.competitionDescription ||
                "An initiative by Triple E Organization, promoting Education, Empowerment, and Environment through learning, knowledge, and healthy academic competition in District Ghanche, Gilgit-Baltistan."}
            </p>

            {/* Result Lookup Action Button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="#result-lookup"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm sm:text-base font-semibold bg-[#183153] hover:bg-[#12243d] text-white transition-colors shadow-xs gap-2 group"
              >
                <span>Check Your Result</span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
              </a>

              <a
                href="#categories"
                className="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-medium text-[#20252B] hover:text-[#183153] border border-[#E6E9EE] hover:border-slate-400 bg-white hover:bg-[#F7F8FA] transition-colors"
              >
                Result Categories
              </a>
            </div>

            {/* Subtle verification badge */}
            <div className="pt-2 flex items-center gap-2 text-xs text-[#737B85]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Official Examination Board Records • Synchronized with Master Ledger</span>
            </div>
          </div>

          {/* Right Column: Prominent Triple E Organization Logo */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-2xl bg-white p-6 sm:p-8 border border-[#E6E9EE] shadow-subtle flex flex-col items-center justify-center">
              <div className="relative w-full h-full">
                <Image
                  src={branding.logoUrl || "/images/logos/triple-e-logo.jpg"}
                  alt={branding.organizationName}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <div className="mt-4 text-center space-y-0.5">
              <p className="text-xs font-semibold text-[#183153] tracking-wide uppercase">
                Education · Empowerment · Environment
              </p>
              <p className="text-[11px] text-[#737B85]">
                District Ghanche, Gilgit-Baltistan
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
