import {
  MarketingNav,
  MarketingFooter,
  ScrollReveal,
  JsonLd,
} from "@/marketing/components";
import {
  HeroSection,
  InstitutionalSection,
  LandingPageSection,
  PlansSection,
  CtaSection,
} from "@/marketing/sites";
import { serviceJsonLd } from "@/marketing/seo";

const PATH = "/produtos/sites-institucionais";
const DESCRIPTION =
  "Site institucional para imobiliárias e landing page para corretores. A partir de R$ 190 para parceiros do CRM. Domínio e hospedagem inclusos.";

const SECTIONS = [
  { id: "institucional", Component: InstitutionalSection },
  { id: "landing", Component: LandingPageSection },
  { id: "plans", Component: PlansSection },
  { id: "cta", Component: CtaSection },
] as const;

export default function SitesPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd
        data={serviceJsonLd({
          name: "Sites e Landing Pages Zone Connection",
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
