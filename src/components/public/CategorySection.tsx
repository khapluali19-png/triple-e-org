import { CATEGORIES } from "@/lib/constants";
import { BookOpen, Clock, Award, ArrowRight } from "lucide-react";

export default function CategorySection() {
  return (
    <section className="py-16 sm:py-24 bg-white border-b border-[#E6E9EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#183153]">
            Curriculum &amp; Academic Tiers
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-light text-[#183153] tracking-tight">
            Academic Competition <span className="font-semibold text-[#20252B]">Tiers &amp; Syllabus</span>
          </h2>
          <p className="text-[#737B85] text-sm sm:text-base leading-relaxed">
            The Triple E 2nd Quiz Competition assesses academic rigor across three tiered curricula, ensuring age-appropriate evaluation and fair benchmarking across District Ghanche.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CATEGORIES.map((cat) => {
            return (
              <div
                key={cat.id}
                className="rounded-xl border border-[#E6E9EE] bg-white p-6 sm:p-8 flex flex-col justify-between shadow-subtle hover:border-slate-400 transition-colors text-left space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#183153] block">
                      {cat.subtitle}
                    </span>
                    <h3 className="font-heading text-xl font-bold text-[#20252B] mt-1">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-[#737B85] mt-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  {/* Tier details */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#E6E9EE] text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#737B85] block">Target Tier</span>
                      <span className="font-semibold text-[#20252B] mt-0.5 block">{cat.grades}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#737B85] block">Time Allowed</span>
                      <span className="font-semibold text-[#20252B] mt-0.5 block flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#183153]" />
                        {cat.timeAllowed}
                      </span>
                    </div>
                  </div>

                  {/* Syllabus / Subject Areas */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#737B85] block flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#183153]" />
                      <span>Curriculum Subjects</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-[#20252B]">
                      {cat.subjects.map((subj, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#183153] mt-1.5 shrink-0" />
                          <span>{subj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="#result-lookup"
                    className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-[#F7F8FA] hover:bg-[#183153] hover:text-white text-[#183153] text-xs font-semibold border border-[#E6E9EE] transition-all gap-1.5 group"
                  >
                    <span>Check {cat.title} Results</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
