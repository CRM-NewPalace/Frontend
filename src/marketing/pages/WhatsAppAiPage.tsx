import {
  MarketingNav,
  MarketingFooter,
  ScrollReveal,
} from "@/marketing/components";
import {
  HeroSection,
  ProblemSection,
  HowItWorksSection,
  IntegrationSection,
  BenefitsSection,
  PlansSection,
  CtaSection,
} from "@/marketing/whatsapp-ai";

const SECTIONS = [
  { id: "problem", Component: ProblemSection },
  { id: "how-it-works", Component: HowItWorksSection },
  { id: "integration", Component: IntegrationSection },
  { id: "benefits", Component: BenefitsSection },
  { id: "plans", Component: PlansSection },
  { id: "cta", Component: CtaSection },
] as const;

export default function WhatsAppAiPage() {
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
