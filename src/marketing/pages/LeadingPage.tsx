import {
  HeroSection,
  MarketingNav,
  ModulesSection,
  ProblemSection,
  SolutionSection,
  WhatsAppAiSection,
  BenefitsSection,
  PlansSection,
  CtaSection,
  MarketingFooter,
  ScrollReveal,
  JsonLd,
} from "@/marketing/components";
import { softwareApplicationJsonLd } from "@/marketing/seo";

const PATH = "/produtos/crm-imobiliario";
const DESCRIPTION =
  "CRM imobiliário com funil, leads, agenda, imóveis, financeiro e automações. Centralize a operação da imobiliária em uma plataforma.";

const SECTIONS = [
  { id: "problem", Component: ProblemSection },
  { id: "solution", Component: SolutionSection },
  { id: "modules", Component: ModulesSection },
  { id: "whatsapp-ai", Component: WhatsAppAiSection },
  { id: "benefits", Component: BenefitsSection },
  { id: "plans", Component: PlansSection },
  { id: "cta", Component: CtaSection },
] as const;

export default function LeadingPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd
        data={softwareApplicationJsonLd({
          name: "CRM Imobiliário Zone Connection",
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
