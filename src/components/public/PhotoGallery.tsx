import Image from "next/image";
import { CURATED_PHOTOGRAPHY } from "@/lib/constants";

export default function PhotoGallery() {
  return (
    <section id="gallery" className="py-16 sm:py-24 bg-[#F7F8FA] border-b border-[#E6E9EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#183153]">
            Academic Rigor &amp; Spirit
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-light text-[#183153] tracking-tight">
            Nurturing Young Minds <span className="font-semibold text-[#20252B]">&amp; Curiosity</span>
          </h2>
          <p className="text-[#737B85] text-sm sm:text-base leading-relaxed">
            Fostering intellectual dedication, teamwork, and spirited academic competition among students across District Ghanche, Gilgit-Baltistan.
          </p>
        </div>

        {/* Photography Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CURATED_PHOTOGRAPHY.map((photo, idx) => (
            <div
              key={idx}
              className="group rounded-xl overflow-hidden bg-white border border-[#E6E9EE] shadow-subtle hover:border-slate-400 transition-colors flex flex-col justify-between text-left"
            >
              <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  className="object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>

              <div className="p-4 space-y-1 bg-white">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#183153] block">
                  Education · Empowerment · Environment
                </span>
                <h4 className="font-heading text-sm font-bold text-[#20252B]">
                  {photo.title}
                </h4>
                <p className="text-xs text-[#737B85] leading-relaxed line-clamp-2">
                  {photo.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
