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
} from '@/marketing/components'

const SECTIONS = [
  { id: 'problem', Component: ProblemSection },
  { id: 'solution', Component: SolutionSection },
  { id: 'modules', Component: ModulesSection },
  { id: 'whatsapp-ai', Component: WhatsAppAiSection },
  { id: 'benefits', Component: BenefitsSection },
  { id: 'plans', Component: PlansSection },
  { id: 'cta', Component: CtaSection },
] as const

export default function LeadingPage() {
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
  )
}
