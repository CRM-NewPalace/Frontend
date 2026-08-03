import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { brl, prioridadeBadgeClass } from "@/lib/crm-types";
import { ApiError } from "@/lib/api";
import { useLeads } from "@/lib/leads-store";
import {
  fetchAnalises,
  updateAnalise,
  assumirAnalise,
  type Analise,
  type AnaliseStatus,
} from "@/lib/analise-api";
import { getSession } from "@/lib/auth";
import {
  SearchCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Wallet,
  FileText,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { phoneDigits } from "@/lib/phone";
import { displayEmail } from "@/lib/email";

export const Route = createFileRoute("/_app/resultado")({
  head: () => ({ meta: [{ title: "Análise — Zone Connection" }] }),
  component: AnalisePage,
});

const COLUMN_STEP_PX = 288 + 12;

const STATUS_LABEL: Record<AnaliseStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

function statusBadgeClass(status: AnaliseStatus) {
  if (status === "aprovado")
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (status === "reprovado")
    return "bg-destructive/15 text-destructive border-destructive/30";
  if (status === "em_analise")
    return "bg-sky-500/15 text-sky-700 border-sky-500/30";
  return "bg-amber-500/15 text-amber-800 border-amber-500/30";
}

function AnaliseCard({ item, onOpen }: { item: Analise; onOpen: () => void }) {
  return (
    <Card
      className="p-3 shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{item.nome}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {item.cidade}
            {item.bairro ? ` · ${item.bairro}` : ""}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] shrink-0 capitalize",
            statusBadgeClass(item.status),
          )}
        >
          {STATUS_LABEL[item.status]}
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="outline"
          className={cn("text-[10px]", prioridadeBadgeClass(item.prioridade))}
        >
          {item.prioridade}
        </Badge>
        <Badge variant="secondary" className="text-[10px] capitalize">
          {item.tipoContato}
        </Badge>
      </div>
    </Card>
  );
}

function AnalisePage() {
  const { assignees, loading: leadsLoading } = useLeads();
  const [items, setItems] = useState<Analise[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Analise | null>(null);
  const [statusDraft, setStatusDraft] = useState<AnaliseStatus>("pendente");
  const [parecerDraft, setParecerDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const corretores = useMemo(
    () => assignees.filter((a) => a.role === "corretor"),
    [assignees],
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAnalises());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as análises.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const columns = useMemo(() => {
    const byCorretor = new Map<string, Analise[]>();
    for (const item of items) {
      const id = item.lead.corretorId ?? "__none__";
      const list = byCorretor.get(id) ?? [];
      list.push(item);
      byCorretor.set(id, list);
    }

    const cols = corretores.map((c) => ({
      id: c.id,
      name: c.name,
      items: byCorretor.get(c.id) ?? [],
    }));

    // Processos sem corretor (legado) — só se existirem
    const orphan = byCorretor.get("__none__") ?? [];
    if (orphan.length > 0) {
      cols.push({ id: "__none__", name: "Sem corretor", items: orphan });
    }

    // Admin: corretores que têm análise mas não estão em assignees (raro)
    for (const [id, list] of byCorretor) {
      if (id === "__none__") continue;
      if (cols.some((c) => c.id === id)) continue;
      cols.push({
        id,
        name: list[0]?.lead.corretor?.name ?? "Corretor",
        items: list,
      });
    }

    return cols;
  }, [items, corretores]);

  const updateScrollButtons = useCallback(() => {
    const el = boardRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      ro.disconnect();
    };
  }, [columns.length, updateScrollButtons]);

  function scrollBoard(dir: -1 | 1) {
    boardRef.current?.scrollBy({
      left: dir * COLUMN_STEP_PX,
      behavior: "smooth",
    });
  }

  function openDetail(item: Analise) {
    setDetail(item);
    setStatusDraft(item.status);
    setParecerDraft(item.parecer ?? "");
  }

  async function handleSaveDetail() {
    if (!detail) return;
    const previousStatus = detail.status;
    setSaving(true);
    try {
      const updated = await updateAnalise(detail.id, {
        status: statusDraft,
        parecer: parecerDraft.trim() || null,
      });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setDetail(updated);

      const isResultado =
        updated.status === "aprovado" || updated.status === "reprovado";
      const statusMudouParaResultado =
        isResultado && previousStatus !== updated.status;

      if (statusMudouParaResultado) {
        toast.success("Análise salva. O corretor foi notificado no sistema.");
        // Abre WhatsApp com mensagem pronta (gerente confirma o envio no app).
        openWhatsApp(updated, { silentIfMissing: true });
      } else {
        toast.success("Análise atualizada.");
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a análise.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openWhatsApp(item: Analise, opts?: { silentIfMissing?: boolean }) {
    const raw = item.lead.corretor?.whatsapp;
    if (!raw) {
      if (!opts?.silentIfMissing) {
        toast.error("Cadastre o WhatsApp do corretor em Usuários.");
      } else {
        toast.message(
          "WhatsApp não aberto: cadastre o número do corretor em Usuários.",
        );
      }
      return;
    }
    const digits = phoneDigits(raw);
    if (digits.length < 10) {
      toast.error("WhatsApp do corretor inválido.");
      return;
    }
    const e164 = digits.startsWith("55") ? digits : `55${digits}`;
    const statusLabel = STATUS_LABEL[item.status];
    const parecer = item.parecer?.trim()
      ? `\nParecer: ${item.parecer.trim()}`
      : "";
    const text = encodeURIComponent(
      `*Resultado da análise*\nCliente: ${item.nome}\nStatus: ${statusLabel}${parecer}`,
    );
    window.open(
      `https://wa.me/${e164}?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const busy = loading || leadsLoading;

  return (
    <div>
      <PageHeader
        title="Análise"
        description="Processos em análise da equipe — uma coluna por corretor."
        actions={
          <div className="flex items-center rounded-md border bg-background">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-r-none"
              disabled={!canScrollLeft}
              aria-label="Coluna anterior"
              title="Coluna anterior"
              onClick={() => scrollBoard(-1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-l-none"
              disabled={!canScrollRight}
              aria-label="Próxima coluna"
              title="Próxima coluna"
              onClick={() => scrollBoard(1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {busy ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando análises...
        </div>
      ) : columns.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-dashed bg-muted/20">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <SearchCheck className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nenhum corretor na equipe</p>
          <p className="text-xs text-muted-foreground mt-1">
            Vincule corretores à equipe em Administração → Equipes. Processos
            entram aqui ao avançar para Em análise no funil.
          </p>
        </div>
      ) : (
        <div
          ref={boardRef}
          className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scroll-smooth"
        >
          {columns.map((col) => (
            <div
              key={col.id}
              className="w-72 shrink-0 flex flex-col bg-muted/40 rounded-xl p-3 min-h-[28rem]"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold truncate">
                      {col.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {col.items.length} processo
                    {col.items.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              <div className="space-y-2 flex-1">
                {col.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-background/50 px-3 py-8 text-center text-xs text-muted-foreground">
                    Nenhum processo em análise
                  </div>
                ) : (
                  col.items.map((item) => (
                    <AnaliseCard
                      key={item.id}
                      item={item}
                      onOpen={() => openDetail(item)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialogShell
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<SearchCheck className="w-5 h-5" />}
        title={detail?.nome ?? "Análise"}
        description={
          detail
            ? `${detail.lead.corretor?.name ?? "Sem corretor"} · ${detail.cidade}`
            : undefined
        }
        className="max-w-lg"
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<User className="w-3.5 h-3.5 text-primary" />}
                title="Cadastro"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <DetailField
                    label="E-mail"
                    value={displayEmail(detail.email) || "—"}
                  />
                  <DetailField label="Telefone" value={detail.telefone} />
                  <DetailField label="Origem" value={detail.origem} />
                  <DetailField label="Interesse" value={detail.interesse} />
                  <DetailField label="Bairro" value={detail.bairro} />
                  <DetailField
                    label="Renda"
                    value={detail.renda != null ? brl(detail.renda) : "—"}
                  />
                  <DetailField
                    label="Construtora"
                    value={detail.lead.construtora?.nome ?? "—"}
                  />
                  <DetailField
                    label="Empreendimento"
                    value={detail.lead.empreendimento?.nome ?? "—"}
                  />
                  <DetailField
                    label="Gerente do corretor"
                    value={detail.lead.corretor?.equipe?.gerente.name ?? "—"}
                  />
                </div>
              </FormSection>

              <FormSection
                icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
                title="Financeiro"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <DetailField
                    label="FGTS"
                    value={
                      detail.temFgts
                        ? detail.valorFgts != null
                          ? brl(detail.valorFgts)
                          : "Sim"
                        : "Não"
                    }
                  />
                  <DetailField
                    label="Entrada"
                    value={
                      detail.temEntrada
                        ? detail.valorEntrada != null
                          ? brl(detail.valorEntrada)
                          : "Sim"
                        : "Não"
                    }
                  />
                  <DetailField
                    label="Dependente"
                    value={detail.temDependente ? "Sim" : "Não"}
                  />
                </div>
              </FormSection>

              <FormSection
                icon={<FileText className="w-3.5 h-3.5 text-primary" />}
                title="Parecer"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={statusDraft}
                    onValueChange={(v) => setStatusDraft(v as AnaliseStatus)}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_analise">Em análise</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="reprovado">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Parecer
                  </Label>
                  <Textarea
                    value={parecerDraft}
                    onChange={(e) => setParecerDraft(e.target.value)}
                    placeholder="Observações da análise..."
                    className="min-h-24 bg-background"
                  />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDetail(null)}
              >
                Fechar
              </Button>
              {detail.status === "pendente" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => {
                    void (async () => {
                      setSaving(true);
                      try {
                        const updated = await assumirAnalise(detail.id);
                        setItems((prev) =>
                          prev.map((x) => (x.id === updated.id ? updated : x)),
                        );
                        setDetail(updated);
                        setStatusDraft(updated.status);
                        toast.success("Processo assumido (Em análise).");
                      } catch (err) {
                        toast.error(
                          err instanceof ApiError
                            ? err.message
                            : "Não foi possível assumir.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    })();
                  }}
                >
                  Assumir
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={!detail.lead.corretor?.whatsapp}
                title={
                  detail.lead.corretor?.whatsapp
                    ? "Abrir WhatsApp de novo (também abre ao salvar aprovado/reprovado)"
                    : "Cadastre o WhatsApp do corretor em Usuários"
                }
                onClick={() => openWhatsApp(detail)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveDetail()}
              >
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value}</div>
    </div>
  );
}
