import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Compass,
  Lightbulb,
  Search,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSession } from "@/lib/auth";
import {
  GUIA_GROUPS,
  GUIA_JOURNEY,
  type GuiaFormula,
  type GuiaGroup,
  type GuiaTopic,
} from "@/lib/guia-sistema-content";
import { canAccessRoute } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function topicMatches(topic: GuiaTopic, query: string) {
  if (!query) return true;
  const blob = [
    topic.title,
    topic.summary,
    ...(topic.steps ?? []),
    ...(topic.tips ?? []),
    ...(topic.formulas ?? []).flatMap((f) => [
      f.title,
      f.expression,
      f.note ?? "",
      f.example ?? "",
    ]),
  ]
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  return blob.includes(query);
}

function FormulaCard({ formula }: { formula: GuiaFormula }) {
  return (
    <div className="rounded-2xl border border-brand-accent/20 bg-gradient-to-br from-brand-accent/8 via-background to-background p-4">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
        <Calculator className="h-3.5 w-3.5" />
        {formula.title}
      </p>
      <p className="font-mono text-[13px] leading-relaxed text-foreground">
        {formula.expression}
      </p>
      {formula.example ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Ex.: {formula.example}
        </p>
      ) : null}
      {formula.note ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {formula.note}
        </p>
      ) : null}
    </div>
  );
}

function TopicCard({
  topic,
  kicker,
  canOpen,
}: {
  topic: GuiaTopic;
  kicker: string;
  canOpen: boolean;
}) {
  return (
    <section id={topic.id} className="scroll-mt-24">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/25 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
              {kicker}
            </p>
            <h3 className="text-lg font-semibold tracking-tight">{topic.title}</h3>
          </div>
          {topic.href && canOpen ? (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to={topic.href as "/dashboard"}>
                Abrir módulo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {topic.summary}
          </p>
          {topic.steps?.length ? (
            <ol className="space-y-2.5">
              {topic.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-accent/15 text-[11px] font-bold text-brand-accent">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {topic.formulas?.length ? (
            <div
              className={cn(
                "grid gap-3",
                topic.formulas.length > 1 ? "sm:grid-cols-2" : "",
              )}
            >
              {topic.formulas.map((formula) => (
                <FormulaCard key={formula.title} formula={formula} />
              ))}
            </div>
          ) : null}
          {topic.tips?.length ? (
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/30">
              <p className="mb-1.5 flex items-center gap-2 font-semibold text-sky-950 dark:text-sky-50">
                <Lightbulb className="h-4 w-4" />
                Vale saber
              </p>
              <ul className="space-y-1 text-[13px] leading-relaxed text-sky-950/80 dark:text-sky-50/80">
                {topic.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function GroupBanner({ group }: { group: GuiaGroup }) {
  return (
    <div
      id={`grupo-${group.id}`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border/80"
    >
      <div className="relative h-40 sm:h-52">
        <img
          src={group.image}
          alt={group.label}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
            {group.kicker}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{group.label}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {group.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function GuiaSistemaPage() {
  const user = getSession();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("jornada");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    if (!q) return GUIA_GROUPS;
    return GUIA_GROUPS.map((group) => ({
      ...group,
      topics: group.topics.filter((topic) => topicMatches(topic, q)),
    })).filter((group) => group.topics.length > 0);
  }, [query]);

  const ids = useMemo(() => {
    const list = ["jornada"];
    for (const group of filtered) {
      list.push(`grupo-${group.id}`);
      for (const topic of group.topics) list.push(topic.id);
    }
    return list;
  }, [filtered]);

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-18% 0px -70% 0px", threshold: [0.12, 0.35] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [ids]);

  function goTo(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function canOpen(href?: string) {
    if (!href || !user) return false;
    return canAccessRoute(
      user.role,
      href,
      user.tenant?.modules ?? null,
      user.tenant?.plano ?? null,
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-brand-accent/12 via-card to-card">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 p-5 sm:p-7">
            <Badge className="w-fit bg-brand-accent/15 text-brand-accent hover:bg-brand-accent/15">
              <Compass className="mr-1 h-3.5 w-3.5" />
              Guia do sistema
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Como usar o CRM, módulo a módulo
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              O menu se divide em Operação, Fechamento, Catálogo, Gestão e
              Financeiro. Abaixo: o que cada tela faz, o caminho do lead até a
              venda e como os números são calculados.
            </p>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar módulo, cálculo, funil, comissão…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "taxa-conversao", label: "Taxa de conversão" },
                { id: "fin-comissao", label: "Comissão" },
                { id: "propostas", label: "Proposta" },
                { id: "metas", label: "Metas" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-accent/25 bg-background/70 px-3 py-1 text-xs font-medium text-brand-accent hover:bg-brand-accent/10"
                >
                  <Calculator className="h-3 w-3" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative min-h-44 lg:min-h-full">
            <img
              src="/guia/hero.png"
              alt="Jornada do lead até a venda"
              className="h-full w-full object-cover lg:rounded-l-none"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-card/40" />
          </div>
        </div>
      </div>

      <div className="flex gap-6 lg:items-start">
        <nav className="sticky top-20 hidden w-60 shrink-0 self-start max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1 lg:block">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Índice
          </p>
          <button
            type="button"
            onClick={() => goTo("jornada")}
            className={cn(
              "mb-3 block w-full rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
              active === "jornada"
                ? "bg-brand-accent/10 font-medium text-brand-accent"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Jornada do lead
          </button>
          {filtered.map((group) => (
            <div key={group.id} className="mb-3">
              <button
                type="button"
                onClick={() => goTo(`grupo-${group.id}`)}
                className={cn(
                  "mb-1 block w-full rounded-md px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                  active === `grupo-${group.id}`
                    ? "text-brand-accent"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {group.label}
              </button>
              <ul className="space-y-0.5 border-l border-border pl-3">
                {group.topics.map((topic) => (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => goTo(topic.id)}
                      className={cn(
                        "block w-full rounded-md px-2 py-1 text-left text-[13px] transition-colors",
                        active === topic.id
                          ? "bg-brand-accent/10 font-medium text-brand-accent"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {topic.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <Chip
              active={active === "jornada"}
              onClick={() => goTo("jornada")}
            >
              Jornada
            </Chip>
            {filtered.map((group) => (
              <Chip
                key={group.id}
                active={active === `grupo-${group.id}` || group.topics.some((t) => t.id === active)}
                onClick={() => goTo(`grupo-${group.id}`)}
              >
                {group.label}
              </Chip>
            ))}
          </div>

          {!query ? (
            <section id="jornada" className="scroll-mt-24">
              <Card className="overflow-hidden">
                <div className="flex items-start gap-4 border-b border-border/70 bg-muted/25 px-5 py-4 sm:px-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-accent/12 text-brand-accent">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
                      Visão geral
                    </p>
                    <h2 className="text-lg font-semibold tracking-tight">
                      Do lead à comissão
                    </h2>
                  </div>
                </div>
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Captação vive em Leads e Funil. Carteira em Clientes. O
                    fechamento é a ficha de Documentação: o analista dá o
                    parecer (Status 1) e o comercial marca a venda (Status 2).
                    Vendido alimenta ranking, metas, taxa de conversão e
                    comissão.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-5">
                    {GUIA_JOURNEY.map((item) => (
                      <div
                        key={item.n}
                        className="rounded-xl border border-border/70 bg-background p-3"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent/15 text-[11px] font-bold text-brand-accent">
                          {item.n}
                        </span>
                        <p className="mt-2 text-sm font-semibold">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Nada encontrado</p>
                <p className="text-xs text-muted-foreground">
                  Tente outro termo — módulo, cálculo ou palavra do fluxo.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {filtered.map((group) => (
            <div key={group.id} className="space-y-4">
              <GroupBanner group={group} />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {group.topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => goTo(topic.id)}
                    className="rounded-xl border border-border/70 bg-card p-3 text-left transition-colors hover:border-brand-accent/40 hover:bg-brand-accent/5"
                  >
                    <p className="text-sm font-semibold">{topic.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {topic.summary}
                    </p>
                  </button>
                ))}
              </div>
              {group.topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  kicker={group.label}
                  canOpen={canOpen(topic.href)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs",
        active
          ? "border-brand-accent/40 bg-brand-accent/10 text-brand-accent"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
