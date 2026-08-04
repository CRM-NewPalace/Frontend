import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  Loader2,
  ReceiptText,
  Search,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { SemConexao } from "@/components/sem-conexao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  displayFonte,
  fetchDocumentacoes,
  type Documentacao,
} from "@/lib/documentacao-api";
import { isStatusVendido } from "@/lib/documentacao-status";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/vendas")({
  head: () => ({ meta: [{ title: "Vendas — Zone Connection" }] }),
  component: VendasPage,
});

function brl(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function dateDay(value: string | null | undefined) {
  return value?.slice(0, 10) ?? "";
}

function dateBr(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

function VendasPage() {
  const user = getSession();
  const canView = user?.role === "admin" || user?.role === "gerente";
  const [docs, setDocs] = useState<Documentacao[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [equipeId, setEquipeId] = useState("__all__");
  const [gerenteId, setGerenteId] = useState("__all__");
  const [corretorId, setCorretorId] = useState("__all__");
  const [origem, setOrigem] = useState("__all__");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([fetchDocumentacoes(), fetchEquipes()])
      .then(([documentacoes, equipesData]) => {
        if (!active) return;
        setDocs(documentacoes.filter((doc) => isStatusVendido(doc.status2)));
        setEquipes(equipesData);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar as vendas.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [canView]);

  const corretorEquipe = useMemo(() => {
    const map = new Map<string, Equipe>();
    for (const equipe of equipes) {
      for (const membro of equipe.membros) map.set(membro.id, equipe);
    }
    return map;
  }, [equipes]);

  const gerentes = useMemo(() => {
    const map = new Map<string, string>();
    for (const equipe of equipes) {
      map.set(equipe.gerente.id, equipe.gerente.name);
    }
    for (const doc of docs) {
      if (doc.gerente) map.set(doc.gerente.id, doc.gerente.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [docs, equipes]);

  const corretores = useMemo(() => {
    const map = new Map<string, string>();
    for (const equipe of equipes) {
      for (const membro of equipe.membros) {
        if (membro.role === "corretor") map.set(membro.id, membro.name);
      }
    }
    for (const doc of docs) {
      const corretor = doc.corretor ?? doc.lead.corretor;
      if (corretor) map.set(corretor.id, corretor.name);
    }
    return [...map.entries()]
      .filter(([id]) => {
        if (equipeId === "__all__") return true;
        return corretorEquipe.get(id)?.id === equipeId;
      })
      .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [docs, equipes, equipeId, corretorEquipe]);

  const origens = useMemo(
    () =>
      [...new Set(docs.map((doc) => doc.lead.origem).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [docs],
  );

  const filtered = useMemo(() => {
    const query = normalize(search);
    return docs.filter((doc) => {
      const docCorretorId = doc.corretorId ?? doc.lead.corretorId;
      const equipe = docCorretorId
        ? corretorEquipe.get(docCorretorId)
        : undefined;
      const docGerenteId = doc.gerenteId ?? equipe?.gerenteId ?? null;
      const vendaDay = dateDay(doc.dataVenda);
      if (equipeId !== "__all__" && equipe?.id !== equipeId) return false;
      if (gerenteId !== "__all__" && docGerenteId !== gerenteId) return false;
      if (corretorId !== "__all__" && docCorretorId !== corretorId) return false;
      if (origem !== "__all__" && doc.lead.origem !== origem) return false;
      if (dataDe && (!vendaDay || vendaDay < dataDe)) return false;
      if (dataAte && (!vendaDay || vendaDay > dataAte)) return false;
      if (!query) return true;
      return normalize(
        [
          doc.nome,
          doc.construtora?.nome,
          doc.empreendimento?.nome,
          doc.corretor?.name ?? doc.lead.corretor?.name,
          doc.gerente?.name,
          doc.lead.origem,
          equipe?.name,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query);
    });
  }, [
    docs,
    search,
    equipeId,
    gerenteId,
    corretorId,
    origem,
    dataDe,
    dataAte,
    corretorEquipe,
  ]);

  const totalVgv = filtered.reduce((sum, doc) => sum + (doc.vgv ?? 0), 0);
  const ticketMedio = filtered.length > 0 ? totalVgv / filtered.length : 0;
  const comVgv = filtered.filter((doc) => (doc.vgv ?? 0) > 0).length;

  const clearFilters = () => {
    setSearch("");
    setEquipeId("__all__");
    setGerenteId("__all__");
    setCorretorId("__all__");
    setOrigem("__all__");
    setDataDe("");
    setDataAte("");
  };

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Vendas"
          description="Processos finalizados com venda."
        />
        <SemConexao
          title="Acesso restrito"
          description="A página de vendas está disponível para administradores e gerentes."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Todos os processos finalizados com venda e seus responsáveis."
      />

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <FinanceKpiCard
          label="Vendas filtradas"
          value={filtered.length}
          icon={ReceiptText}
          tone="emerald"
          format="number"
        />
        <FinanceKpiCard
          label="VGV vendido"
          value={totalVgv}
          icon={Wallet}
          tone="teal"
        />
        <FinanceKpiCard
          label="Ticket médio"
          value={ticketMedio}
          icon={BadgeDollarSign}
          tone="blue"
        />
        <FinanceKpiCard
          label="Vendas com VGV"
          value={comVgv}
          icon={UsersRound}
          tone="violet"
          format="number"
          suffix={`de ${filtered.length}`}
        />
      </section>

      <Card className="mt-5">
        <CardContent className="pt-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente, empreendimento ou responsável..."
                className="pl-9"
              />
            </div>
            <Select
              value={equipeId}
              onValueChange={(value) => {
                setEquipeId(value);
                setCorretorId("__all__");
              }}
            >
              <SelectTrigger><SelectValue placeholder="Todas as equipes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as equipes</SelectItem>
                {equipes.map((equipe) => (
                  <SelectItem key={equipe.id} value={equipe.id}>
                    {equipe.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gerenteId} onValueChange={setGerenteId}>
              <SelectTrigger><SelectValue placeholder="Todos os gerentes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os gerentes</SelectItem>
                {gerentes.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={corretorId} onValueChange={setCorretorId}>
              <SelectTrigger><SelectValue placeholder="Todos os corretores" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os corretores</SelectItem>
                {corretores.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger><SelectValue placeholder="Todas as origens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as origens</SelectItem>
                {origens.map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dataDe}
                onChange={(event) => setDataDe(event.target.value)}
                className="pl-9"
                aria-label="Data da venda inicial"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dataAte}
                onChange={(event) => setDataAte(event.target.value)}
                aria-label="Data da venda final"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={clearFilters}
                title="Limpar filtros"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando vendas…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Gerente</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead>Data da venda</TableHead>
                  <TableHead className="text-right">VGV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => {
                  const docCorretorId = doc.corretorId ?? doc.lead.corretorId;
                  const equipe = docCorretorId
                    ? corretorEquipe.get(docCorretorId)
                    : undefined;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="font-medium">{doc.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.construtora?.nome ?? "Sem construtora"}
                        </div>
                      </TableCell>
                      <TableCell>{doc.empreendimento?.nome ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {displayFonte(doc.lead.origem || doc.fonte)}
                        </Badge>
                      </TableCell>
                      <TableCell>{equipe?.name ?? "—"}</TableCell>
                      <TableCell>
                        {doc.gerente?.name ?? equipe?.gerente.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {doc.corretor?.name ?? doc.lead.corretor?.name ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {dateBr(doc.dataVenda)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                        {doc.vgv != null ? brl(doc.vgv) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
