import { Helmet } from "react-helmet-async";
import { MarketingFooter } from "@/marketing/components/MarketingFooter";
import { MarketingNav } from "@/marketing/components/MarketingNav";
import { ChallengesSection } from "@/marketing/home/ChallengesSection";
import { CTASection } from "@/marketing/home/CTASection";
import { HeroSection } from "@/marketing/home/HeroSection";
import { HomeBackground } from "@/marketing/home/HomeBackground";
import { TimelineSection } from "@/marketing/home/TimelineSection";

const SEO_TITLE = "Zone Connection | Tecnologia para imobiliárias";
const SEO_DESCRIPTION =
  "CRM imobiliário, IA no WhatsApp e sites para imobiliárias — um ecossistema para gestão, atendimento e captação no mesmo lugar.";

export default function Home() {
  return (
    <div className="relative min-h-screen text-brand-dark">
      <Helmet>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESCRIPTION} />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESCRIPTION} />
      </Helmet>

      <HomeBackground />
      <MarketingNav />
      <main className="relative z-0">
        <HeroSection />
        <ChallengesSection />
        <TimelineSection />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
