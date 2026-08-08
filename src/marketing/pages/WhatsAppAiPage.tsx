import {
  MarketingNav,
  MarketingFooter,
  ScrollReveal,
  JsonLd,
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
import { softwareApplicationJsonLd } from "@/marketing/seo";

const PATH = "/produtos/ia-whatsapp";
const DESCRIPTION =
  "IA de WhatsApp que atende 24h, qualifica leads, agenda visitas e integra com o CRM Zone Connection. Planos IA SDR e IA Comercial.";

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
      <JsonLd
        data={softwareApplicationJsonLd({
          name: "IA para WhatsApp Zone Connection",
          description: DESCRIPTION,
          path: PATH,
        })}
      />
      <MarketingNav />
      <main>
        <HeroSection />

        {SECTIONS.map(({ id, Component }) => (
          <ScrollReveal key={id}>
            <Component />
          </ScrollReveal>
        ))}
      </main>
      <MarketingFooter />
    </div>
  );
}
