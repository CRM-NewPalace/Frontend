import { MarketingFooter } from "@/marketing/components/MarketingFooter";
import { MarketingNav } from "@/marketing/components/MarketingNav";
import { JsonLd } from "@/marketing/components/JsonLd";
import { ChallengesSection } from "@/marketing/home/ChallengesSection";
import { CTASection } from "@/marketing/home/CTASection";
import { FeatureHighlights } from "@/marketing/home/FeatureHighlights";
import { HeroSection } from "@/marketing/home/HeroSection";
import { HomeBackground } from "@/marketing/home/HomeBackground";
import { TimelineSection } from "@/marketing/home/TimelineSection";
import { organizationJsonLd, websiteJsonLd } from "@/marketing/seo";

export default function Home() {
  return (
    <div className="relative min-h-screen text-brand-dark">
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <HomeBackground />
      <MarketingNav />
      <main className="relative z-0">
        <HeroSection />
        <ChallengesSection />
        <FeatureHighlights />
        <TimelineSection />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
