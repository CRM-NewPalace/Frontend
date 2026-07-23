import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EMPREENDIMENTOS,
  EMPREENDIMENTO_CIDADES,
  NEW_PALACE_SITE,
  empreendimentoUrl,
  type Empreendimento,
} from "@/lib/empreendimentos-newpalace";
import { Bath, BedDouble, ExternalLink, MapPin, Ruler, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Imob CRM" }] }),
  component: Imoveis,
});

function EmpreendimentoThumb({
  im,
  priority,
}: {
  im: Empreendimento;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-40 bg-muted overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-muted via-muted to-muted-foreground/10 animate-pulse",
          loaded && "hidden",
        )}
      />
      <img
        src={im.imagem}
        alt={im.titulo}
        width={480}
        height={320}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        onLoad={() => setLoaded(true)}
        className={cn(
          "w-full h-full object-cover group-hover:scale-105 transition-[transform,opacity] duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
      <Badge className="absolute top-2 left-2 border bg-success/15 text-success border-success/30">
        {im.status}
      </Badge>
      <Badge variant="secondary" className="absolute top-2 right-2 bg-black/60 text-white border-0">
        Venda
      </Badge>
    </div>
  );
}

function Imoveis() {
  const [search, setSearch] = useState("");
  const [cidade, setCidade] = useState("all");
  const [quartos, setQuartos] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EMPREENDIMENTOS.filter((e) => {
      if (cidade !== "all" && e.cidade !== cidade) return false;
      if (quartos !== "all" && e.quartos !== Number(quartos)) return false;
      if (!q) return true;
      return (
        e.titulo.toLowerCase().includes(q) ||
        e.bairro.toLowerCase().includes(q) ||
        e.cidade.toLowerCase().includes(q) ||
        e.endereco.toLowerCase().includes(q)
      );
    });
  }, [search, cidade, quartos]);

  return (
    <div>
      <PageHeader
        title="Imóveis"
        description={`${filtered.length} de ${EMPREENDIMENTOS.length} empreendimentos New Palace`}
        actions={
          <Button size="sm" variant="outline" asChild>
            <a href={`${NEW_PALACE_SITE}/#empreendimentos`} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" />
              Ver no site
            </a>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empreendimento, bairro, cidade..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={cidade} onValueChange={setCidade}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {EMPREENDIMENTO_CIDADES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={quartos} onValueChange={setQuartos}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Quartos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos quartos</SelectItem>
              <SelectItem value="1">1 quarto</SelectItem>
              <SelectItem value="2">2 quartos</SelectItem>
              <SelectItem value="3">3 quartos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((im, index) => (
          <a
            key={im.id}
            href={empreendimentoUrl(im.slug)}
            target="_blank"
            rel="noreferrer"
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
          >
            <Card className="overflow-hidden group cursor-pointer pt-0 h-full hover:shadow-md transition-shadow">
              <EmpreendimentoThumb im={im} priority={index < 8} />
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground flex items-center justify-between gap-2">
                  <span>Apartamento</span>
                  <span className="inline-flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver no site <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-sm font-medium mt-1 line-clamp-2 min-h-10">{im.titulo}</div>
                <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{im.bairro}, {im.cidade}</span>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{im.area} m²</span>
                  <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{im.quartos}</span>
                  <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{im.banheiros}</span>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-16">
          Nenhum empreendimento encontrado com esses filtros.
        </div>
      )}
    </div>
  );
}
