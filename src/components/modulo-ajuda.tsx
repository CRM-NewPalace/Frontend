import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calculator,
  CheckCircle2,
  CircleHelp,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  findGuiaTopicByPath,
  type GuiaTopic,
} from "@/lib/guia-sistema-content";
import { startGuiaTour } from "@/lib/guia-tour";
import { cn } from "@/lib/utils";

function TopicHelpBody({ topic }: { topic: GuiaTopic }) {
  return (
    <div className="space-y-5 text-left">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {topic.summary}
      </p>
      <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-sm">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
        <p>
          <span className="font-medium">Quem usa. </span>
          <span className="text-muted-foreground">{topic.who}</span>
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-brand-accent" />
          O que você pode fazer
        </h3>
        <ol className="space-y-2">
          {topic.actions.map((action, index) => (
            <li
              key={action.title}
              className="rounded-xl border border-border/70 bg-card px-3 py-3"
            >
              <p className="text-sm font-semibold">
                <span className="mr-2 text-brand-accent">{index + 1}.</span>
                {action.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {action.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {topic.how?.length ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-brand-accent" />
            Ordem típica
          </h3>
          <ol className="space-y-1.5">
            {topic.how.map((step, index) => (
              <li
                key={step}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="font-semibold text-brand-accent">
                  {index + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {topic.formulas?.length ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Calculator className="h-4 w-4 text-brand-accent" />
            Como os números fecham
          </h3>
          {topic.formulas.map((formula) => (
            <div
              key={formula.title}
              className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
                {formula.title}
              </p>
              <p className="mt-1 font-mono text-[13px] leading-relaxed">
                {formula.expression}
              </p>
              {formula.example ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Ex.: {formula.example}
                </p>
              ) : null}
              {formula.note ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {formula.note}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {topic.tips?.length ? (
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 px-3 py-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/30">
          <p className="mb-1.5 flex items-center gap-2 font-semibold text-sky-950 dark:text-sky-50">
            <Lightbulb className="h-4 w-4" />
            Vale saber
          </p>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-sky-950/80 dark:text-sky-50/80">
            {topic.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ModuloAjudaButton({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const found = findGuiaTopicByPath(pathname);
  const [open, setOpen] = useState(false);

  if (!found) return null;

  const { topic, group } = found;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("shrink-0", className)}
        onClick={() => setOpen(true)}
      >
        <CircleHelp className="h-3.5 w-3.5" />
        Como usar
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b border-border px-6 py-5 pr-12 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
              {group.label}
            </p>
            <SheetTitle>Como usar {topic.title}</SheetTitle>
            <SheetDescription>
              Funcionalidades desta tela e a ordem típica de uso.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 px-6 py-5">
            <TopicHelpBody topic={topic} />
          </div>
          <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background px-6 py-4 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setOpen(false);
                startGuiaTour(topic.id, { live: true });
              }}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Destacar na tela
            </Button>
            <Button asChild type="button" size="sm" variant="outline">
              <Link
                to="/guia-sistema"
                search={{ modulo: topic.id }}
                onClick={() => setOpen(false)}
              >
                Abrir no guia
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
