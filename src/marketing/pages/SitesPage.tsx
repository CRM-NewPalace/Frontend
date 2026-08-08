import {
  MarketingNav,
  MarketingFooter,
  ScrollReveal,
} from "@/marketing/components";
import {
  HeroSection,
  InstitutionalSection,
  LandingPageSection,
  PlansSection,
  CtaSection,
} from "@/marketing/sites";

const SECTIONS = [
  { id: "institucional", Component: InstitutionalSection },
  { id: "landing", Component: LandingPageSection },
  { id: "plans", Component: PlansSection },
  { id: "cta", Component: CtaSection },
] as const;

export default function SitesPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <HeroSection />

      {SECTIONS.map(({ id, Component }) => (
        <ScrollReveal key={id}>
          <Component />
        </ScrollReveal>
      ))}

      <MarketingFooter />
    </div>
  );
}
