import { COMPETITION_RULES, DEFAULT_BRANDING } from "@/lib/constants";
import { WebsiteBrandingConfig } from "@/lib/types";
import { ShieldCheck, Award, CheckCircle2, Database, ArrowRight, User, Users, MapPin, School, Search } from "lucide-react";

interface CompetitionInfoProps {
  branding?: WebsiteBrandingConfig;
}

const CHECK_STEPS = [
  {
    step: 1,
    title: "1. Full Name",
    description: "Enter your full name.",
    icon: User,
  },
  {
    step: 2,
    title: "2. Father's Name",
    description: "Provide your father's name for additional identification, if available.",
    icon: Users,
  },
  {
    step: 3,
    title: "3. Examination Center",
    description: "Select the examination center where you took the test.",
    icon: MapPin,
  },
  {
    step: 4,
    title: "4. School Name",
    description: "Enter your school name when needed to help identify the correct record.",
    icon: School,
  },
  {
    step: 5,
    title: "5. Check Result",
    description: 'Click "Check Result" to view your result.',
    icon: Search,
  },
];

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Guidelines & Evaluation Protocol */}
        <div className="space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#183153]">
              Guidelines &amp; Evaluation Protocol
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-light text-[#183153] tracking-tight">
              About the Competition <span className="font-semibold text-[#20252B]">&amp; Standards</span>
            </h2>
            <p className="text-[#737B85] text-sm sm:text-base leading-relaxed">
              Triple E Organization conducts the 2nd Quiz Competition across District Ghanche, Gilgit-Baltistan, Pakistan with transparent evaluation protocols and certified examination committee oversight.
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

        {/* Result-Checking Guide */}
        <div id="instructions" className="scroll-mt-24 pt-8 border-t border-[#E6E9EE] space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#183153]">
              Step-by-Step Instructions
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-light text-[#183153] tracking-tight">
              How to Check <span className="font-semibold text-[#20252B]">Your Result</span>
            </h2>
            <p className="text-[#737B85] text-sm sm:text-base leading-relaxed">
              Follow these simple steps to look up your examination marks, performance grade, and view your official Certificate of Achievement.
            </p>
          </div>

          {/* 5 Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {CHECK_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="bg-white p-5 rounded-xl border border-[#E6E9EE] shadow-subtle hover:border-slate-400 transition-colors flex flex-col justify-between text-left space-y-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-full bg-[#183153] text-white text-xs font-bold flex items-center justify-center">
                        {step.step}
                      </span>
                      <Icon className="w-4 h-4 text-[#737B85]" />
                    </div>
                    <h3 className="font-heading text-sm font-bold text-[#20252B]">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#737B85] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Button linking to existing result lookup form */}
          <div className="text-center pt-2">
            <a
              href="#result-lookup"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm sm:text-base font-semibold bg-[#183153] hover:bg-[#12243d] text-white transition-colors shadow-xs gap-2 group"
            >
              <span>Check Result Now</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
