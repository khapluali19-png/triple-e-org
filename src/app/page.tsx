import Header from "@/components/public/Header";
import Hero from "@/components/public/Hero";
import CountdownSection from "@/components/public/CountdownSection";
import ResultLookup from "@/components/public/ResultLookup";
import CategorySection from "@/components/public/CategorySection";
import CompetitionInfo from "@/components/public/CompetitionInfo";
import PhotoGallery from "@/components/public/PhotoGallery";
import Footer from "@/components/public/Footer";
import { getWebsiteBranding } from "@/lib/server/brandingStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  const branding = getWebsiteBranding();
  const isCountdownActive = Boolean(branding.countdown?.enabled);

  return (
    <div className="min-h-screen flex flex-col bg-white selection:bg-[#183153]/10 selection:text-[#183153]">
      <Header branding={branding} />
      <main className="flex-1">
        <Hero branding={branding} />
        {isCountdownActive && <CountdownSection branding={branding} />}
        <ResultLookup branding={branding} />
        <CategorySection />
        <CompetitionInfo branding={branding} />
        <PhotoGallery />
      </main>
      <Footer branding={branding} />
    </div>
  );
}
