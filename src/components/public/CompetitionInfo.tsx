import { COMPETITION_RULES, DEFAULT_BRANDING } from "@/lib/constants";
import { WebsiteBrandingConfig } from "@/lib/types";
import { ShieldCheck, Award, CheckCircle2, Database } from "lucide-react";

interface CompetitionInfoProps {
  branding?: WebsiteBrandingConfig;
}

export default function CompetitionInfo({ branding = DEFAULT_BRANDING }: CompetitionInfoProps) {
  const iconMap: Record<string, React.ReactNode> = {
    ShieldCheck: <ShieldCheck className="w-5 h-5 text-[#183153]" />,
    Award: <Award className="w-5 h-5 text-[#183153]" />,
    CheckCircle2: <CheckCircle2 className="w-5 h-5 text-[#183153]" />,
    Database: <Database className="w-5 h-5 text-[#183153]" />,
  };

  return (
    <section id="competition-info" className="py-16 sm:py-24 bg-white border-b border-[#E6E9EE]">
      <div id="about" className="scroll-mt-24" />
      <div id="instructions" className="scroll-mt-24" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#183153]">
            Guidelines &amp; Evaluation Protocol
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-light text-[#183153] tracking-tight">
            About the Competition <span className="font-semibold text-[#20252B]">&amp; Standards</span>
          </h2>
          <p className="text-[#737B85] text-sm sm:text-base leading-relaxed">
            Triple E Organization conducts its annual Quiz Competition across District Ghanche with transparent evaluation protocols and certified examination committee oversight.
          </p>
        </div>

        {/* 4 Standard / Rule Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {COMPETITION_RULES.map((rule) => (
            <div
              key={rule.id}
              className="bg-white p-6 rounded-xl border border-[#E6E9EE] shadow-subtle hover:border-slate-400 transition-colors space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#F7F8FA] border border-[#E6E9EE] flex items-center justify-center">
                  {iconMap[rule.iconName] || <Award className="w-5 h-5 text-[#183153]" />}
                </div>
                <h3 className="font-heading text-base font-bold text-[#183153]">
                  {rule.title}
                </h3>
                <p className="text-xs text-[#737B85] leading-relaxed">
                  {rule.detail}
                </p>
              </div>
              <div className="pt-3 border-t border-[#E6E9EE]">
                <span className="text-[10px] font-semibold text-[#737B85] uppercase tracking-wider">
                  Triple E Protocol
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
