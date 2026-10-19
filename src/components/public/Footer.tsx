import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { DEFAULT_BRANDING } from "@/lib/constants";
import { WebsiteBrandingConfig } from "@/lib/types";

interface FooterProps {
  branding?: WebsiteBrandingConfig;
}

export default function Footer({ branding = DEFAULT_BRANDING }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const partner = branding.partnerAttribution || DEFAULT_BRANDING.partnerAttribution;

  return (
    <footer className="bg-white text-[#20252B] border-t border-[#E6E9EE]">
      {/* Upper Footer: Minimal Organization Info & Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Col 1: Organization Identity */}
          <div className="lg:col-span-6 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden bg-white p-0.5 border border-[#E6E9EE] shrink-0">
                <Image
                  src={branding.logoUrl || "/images/logos/triple-e-logo.jpg"}
                  alt={branding.organizationName}
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-[#183153] tracking-tight">
                  {branding.organizationName}
                </h3>
                <p className="text-xs text-[#183153] font-semibold">
                  Education · Empowerment · Environment
                </p>
                <p className="text-[11px] text-[#737B85]">
                  District Ghanche, Gilgit-Baltistan, Pakistan
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#737B85] leading-relaxed max-w-md">
              Promoting Education, Empowerment, and Environment through learning, knowledge, and healthy academic competition across District Ghanche.
            </p>

            <div className="flex items-center gap-2 text-xs text-[#183153] pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Official 2nd Quiz Competition Results Portal</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="lg:col-span-3 space-y-3 text-left">
            <h4 className="font-heading text-xs font-bold text-[#183153] uppercase tracking-wider">
              Navigation &amp; Records
            </h4>
            <ul className="space-y-2 text-xs text-[#737B85]">
              <li>
                <a href="#result-lookup" className="hover:text-[#183153] transition-colors">
                  • Check Competition Result
                </a>
              </li>
              <li>
                <a href="#categories" className="hover:text-[#183153] transition-colors">
                  • Lower Class Category (Primary)
                </a>
              </li>
              <li>
                <a href="#categories" className="hover:text-[#183153] transition-colors">
                  • Middle Class Category (Junior)
                </a>
              </li>
              <li>
                <a href="#categories" className="hover:text-[#183153] transition-colors">
                  • Overall Championship Category
                </a>
              </li>
              <li>
                <a href="#instructions" className="hover:text-[#183153] transition-colors">
                  • Guidelines &amp; Evaluation Rules
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Examination Secretariat Info */}
          <div className="lg:col-span-3 space-y-3 text-left">
            <h4 className="font-heading text-xs font-bold text-[#183153] uppercase tracking-wider">
              Examination Cell
            </h4>
            <div className="space-y-2 text-xs text-[#737B85]">
              <p className="font-medium text-[#20252B]">
                Triple E Examination &amp; Evaluation Board
              </p>
              <p>
                District Ghanche, Gilgit-Baltistan
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                All records are verified and synchronized directly with the official Google Sheets master ledger.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/login"
                  className="text-xs text-[#737B85] hover:text-[#183153] transition-colors inline-block"
                >
                  • Administrator Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Copyright Line */}
        <div className="mt-10 pt-6 border-t border-[#E6E9EE] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#737B85] text-center sm:text-left">
          <p>© {currentYear} {branding.organizationName} • District Ghanche, Gilgit-Baltistan. All Rights Reserved.</p>
          <p className="text-[11px] text-slate-400">
            {branding.competitionTitle} • Official Examination System
          </p>
        </div>
      </div>

      {/* The Very Bottom: Siachen Mark Agency Partner Attribution */}
      {partner.enabled && (
        <div className="border-t border-[#E6E9EE] bg-[#F7F8FA] py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
            <a
              href={partner.partnerWebsiteUrl || "https://siachen-mark.vercel.app/"}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col sm:flex-row items-center gap-3 focus:outline-none focus:ring-1 focus:ring-[#183153] rounded-lg p-1 transition-all"
              aria-label={`${partner.partnerName || "Siachen Mark Agency"} - ${partner.tagline || "Designed & Developed by Siachen Mark Agency"}`}
            >
              {/* Authentic Siachen Mark Logo with preserved 1:1 aspect ratio */}
              <div className="relative w-8 h-8 rounded-md overflow-hidden bg-white p-0.5 border border-[#E6E9EE] group-hover:border-[#183153] shadow-xs transition-colors shrink-0">
                <Image
                  src={partner.partnerLogoUrl || "/images/logos/siachen-mark-logo.jpg"}
                  alt={partner.partnerName || "Siachen Mark Agency"}
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>

              {/* Attribution Details */}
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="font-heading font-semibold text-xs sm:text-sm text-[#20252B] group-hover:text-[#183153] transition-colors">
                    {partner.tagline || "Designed & Developed by Siachen Mark Agency"}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white text-[#183153] border border-[#E6E9EE]">
                    {partner.location || "Islamabad"}
                  </span>
                  <ExternalLink className="w-3 h-3 text-[#737B85] group-hover:text-[#183153] transition-colors" />
                </div>
                <p className="text-[11px] text-[#737B85]">
                  {partner.developerCredit || "Basharat Ali | Former Social Media Head, Triple E Organization"}
                </p>
              </div>
            </a>
          </div>
        </div>
      )}
    </footer>
  );
}
